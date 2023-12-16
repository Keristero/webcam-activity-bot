const puppeteer = require('puppeteer');
const path = require('path')
const pixelmatch = require('pixelmatch')
const PNG = require('pngjs').PNG;
const { createCanvas, loadImage } = require('canvas')
const { Client, GatewayIntentBits,AttachmentBuilder,EmbedBuilder } = require('discord.js');
const {OUT_FOLDER,DISCORD_TOKEN,CHANNEL_ID,DEBUG_CHANNEL_ID,WEBSITE_URL,DEBUG_MODE} = require('./environment')
const GIFEncoder = require('gifencoder')
const fs = require('fs')

if(DEBUG_MODE){
    CHANNEL_ID = DEBUG_CHANNEL_ID;
}


const activity_timeout_frames = 10; //15 is good
const maximum_activity_length = 60; //max gif length, 45 is good
const pixels_changed_threshold = 40;//40 seems best so far
const window_width = 675;
const window_height = 550;
const gif_framerate = 5;
const crop_width = 640;
const crop_height = 480;
const crop_x = 18;
const crop_y = 62;
const crop_scale = 0.5;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
        // Add other intents as needed for your bot
    ] 
});

let channel;
client.once('ready', () => {
    console.log('Bot is ready!');
    channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        console.log(`Channel found: ${channel.name} (${channel.id})`);
    } else {
        console.log(`Channel with ID ${CHANNEL_ID} not found.`);
    }
});

client.login(DISCORD_TOKEN);


let previous_frame = null
let frames_since_movement = Infinity; //frames since last movement
let frames_active = 0 //sum of frames in current activity
let page;
var encoder;
let recording_gif_path = false
let frame_ms = 1000/gif_framerate

const canvas_cropped = createCanvas(crop_width*crop_scale, crop_height*crop_scale);
const ctx_cropped = canvas_cropped.getContext('2d');


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function recordLoop(){
    const startTime = performance.now();
  
    if(recording_gif_path){
        const frame = await page.screenshot({ encoding: 'base64' });
        const buffer = Buffer.from(frame, 'base64');
        let frame_png = await loadImage(buffer)
        ctx_cropped.drawImage(frame_png, crop_x, crop_y, crop_width, crop_height,0,0,canvas_cropped.width,canvas_cropped.height)
        //encoder.addFrame(ctx);
        encoder.addFrame(ctx_cropped);
    }

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    await sleep(Math.max(0,frame_ms-elapsedTime)); // frame ms
    return recordLoop()
}

function startRecording(){
    if(recording_gif_path){
        return
    }
    let file_name = generateFilenameWithTimestamp('arthur','gif')
    recording_gif_path = path.join(OUT_FOLDER, file_name)
    encoder = new GIFEncoder(canvas_cropped.width, canvas_cropped.height)
    encoder.createReadStream().pipe(fs.createWriteStream(recording_gif_path))
    encoder.start()
    encoder.setRepeat(-1) // 0 for repeat, -1 for no-repeat
    encoder.setDelay(frame_ms) // frame delay in ms
    encoder.setQuality(-10) // image quality. 10 is default.
}

function stopRecording(){
    if(!recording_gif_path){
        return
    }
    encoder.finish();
    let path = recording_gif_path
    recording_gif_path = false
    return path
}

function sendDiscordMessage(filepath,embed_title){
    try{
        let fileName = filepath.split('\\')[1]
        const file = new AttachmentBuilder(`.\\${filepath}`);
        const embed = new EmbedBuilder()
        .setTitle(embed_title)
        .setImage(`attachment://${fileName}`)
        console.log(filepath,fileName)
        if(DEBUG_MODE){
            embed.setDescription('this one is just a test')
        }
        channel.send({ embeds: [embed], files: [file] });
    }catch(e){
        console.log('failed to send discord image',e)
    }
}

// Function to analyze frames for movement
function detectMovement(frame) {
    if(previous_frame){
        if(differenceIsGreaterThanThreshold(previous_frame,frame,0.8,pixels_changed_threshold)){
            return true
        }
    }
    return false
}

function generateFilenameWithTimestamp(filename, fileExtension) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, ''); // Creating a timestamp in a format suitable for a filename
    return `${filename}_${timestamp}.${fileExtension}`;
}

function differenceIsGreaterThanThreshold(current_image,previous_image,threshold=0.1,pixel_threshold=1){
    const diff = new PNG({ width: current_image.width, height: current_image.height });
    const numDiffPixels = pixelmatch(previous_image.data, current_image.data, diff.data, current_image.width, current_image.height, { threshold: threshold });
    //console.log('pixels = ',numDiffPixels)
    if (numDiffPixels > pixel_threshold) {
        return true
    }
    return false
}

function saveFrame(image, out_folder) {
    return new Promise((resolve, reject) => {
        let new_png = new PNG({
            width: image.width,
            height: image.height
        });
        new_png.data = image.data;
        let file_name = generateFilenameWithTimestamp('arthur','png')
        let new_file_path = path.join(out_folder, file_name)
        new_png.pack().pipe(fs.createWriteStream(new_file_path)).on("finish", function () {
            resolve(new_file_path,file_name)
        });
    })
}

// Main function to watch the video stream
async function watchVideoStream(url) {
    const browser = await puppeteer.launch();
    page = await browser.newPage();

    // Navigate to the webpage with the video stream
    await page.setViewport({
        width: window_width,
        height: window_height,
        deviceScaleFactor: 1,
    });
    await page.goto(url);

    // Main loop to capture frames and check for movement
    while (true) {
        // Capture the current frame
        const frame = await page.screenshot({ encoding: 'base64' });
        const buffer = Buffer.from(frame, 'base64');
        let frame_png = PNG.sync.read(buffer);

        // Check for movement
        if (detectMovement(frame_png)) {
            console.log('Movement detected!');
            frames_since_movement = 0
            if(frames_active == 0){
                //activity started
                saveFrame(frame_png,OUT_FOLDER).then((filepath)=>{
                    sendDiscordMessage(filepath,"Movement detected!")
                })
                startRecording()
            }
            // Perform any action when movement is detected
        }else{
            frames_since_movement++
        }
        if(frames_since_movement < activity_timeout_frames){
            //activity active
            frames_active++
        }
        if((frames_since_movement > activity_timeout_frames && frames_active > 0) || frames_active == maximum_activity_length){
            //activity finished
            console.log('Activty summary:');
            frames_active = 0
            let gif_path = stopRecording()
            sendDiscordMessage(gif_path,"Activty summary:")
        }
        previous_frame = frame_png

        await sleep(1000); // 1 second delay
    }

    // Close the browser when done
    await browser.close();
}

// Start watching the video stream
watchVideoStream(WEBSITE_URL);
recordLoop();