const puppeteer = require('puppeteer');
const path = require('path')
const pixelmatch = require('pixelmatch')
const PNG = require('pngjs').PNG;
const { createCanvas, loadImage } = require('canvas')
const { Client, GatewayIntentBits,AttachmentBuilder,EmbedBuilder } = require('discord.js');
const environment = require('./environment')
let debug_mode = true

const url = `http://server.quotro.net:2583/`
const out_folder = './out'
const fs = require('fs')
const token = environment.DISCORD_TOKEN
const channelId = '272616531295469568';
const activity_timeout_frames = 30; //after thirty frames without movement, activity ends
const activity_snapshot_interval = 30
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
    channel = client.channels.cache.get(channelId);
    if (channel) {
        console.log(`Channel found: ${channel.name} (${channel.id})`);
    } else {
        console.log(`Channel with ID ${channelId} not found.`);
    }
});

client.login(token);


let previous_frame = null
let frame_no = 0
let frames_since_movement = Infinity; //frames since last movement
let frames_active = 0 //sum of frames in current activity

function sendDiscordMessage(filepath,embed_title){
    try{
        let fileName = filepath.split('\\')[1]
        const file = new AttachmentBuilder(`.\\${filepath}`);
        const embed = new EmbedBuilder()
        .setTitle(embed_title)
        .setImage(`attachment://${fileName}`)
        console.log(filepath,fileName)
        if(debug_mode){
            embed.setDescription('this one is just a test')
        }
        channel.send({ embeds: [embed], files: [file] });
    }catch(e){
        console.log('failed to send discord image',e)
    }
}

// Function to analyze frames for movement
function detectMovement(frame) {
    // Add your computer vision logic here
    // For example, you can use OpenCV.js to detect changes in the frame
    // and determine if there is movement.
    // Refer to OpenCV.js documentation for more details: https://docs.opencv.org/master/d5/d10/tutorial_js_root.html
    // You might use functions like cv.absdiff, cv.cvtColor, cv.threshold, etc.
    // Return true if movement is detected, false otherwise.
    console.log('frame')
    if(previous_frame){
        if(differenceIsGreaterThanThreshold(previous_frame,frame,0.8,1000)){
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
    console.log('pixels = ',numDiffPixels)
    if (numDiffPixels > pixel_threshold) {
        return true
    }
    return false
}

function saveFrame(image, output_folder) {
    return new Promise((resolve, reject) => {
        let new_png = new PNG({
            width: image.width,
            height: image.height
        });
        new_png.data = image.data;
        let file_name = generateFilenameWithTimestamp('arthur','png')
        let new_file_path = path.join(output_folder, file_name)
        new_png.pack().pipe(fs.createWriteStream(new_file_path)).on("finish", function () {
            resolve(new_file_path,file_name)
        });
    })
}

// Main function to watch the video stream
async function watchVideoStream(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the webpage with the video stream
    await page.setViewport({
        width: 675,
        height: 550,
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
                saveFrame(frame_png,out_folder).then((filepath)=>{
                    sendDiscordMessage(filepath,"Movement detected!")
                })
            }
            // Perform any action when movement is detected
        }else{
            frames_since_movement++
        }
        if(frames_since_movement < activity_timeout_frames){
            //activity active
            console.log('Activty active');
            frames_active++
            if(frames_active % activity_snapshot_interval == 0){
                saveFrame(frame_png,out_folder).then((filepath)=>{
                    sendDiscordMessage(filepath,"Continued activity...")
                })
            }
        }
        if(frames_since_movement > activity_timeout_frames && frames_active > 0){
            //activity finished
            console.log('Activty finished');
            frames_active = 0
            if(frames_active % activity_snapshot_interval == 0){
                saveFrame(frame_png,out_folder).then((filepath)=>{
                    sendDiscordMessage(filepath,"Activty ended.")
                })
            }
        }
        previous_frame = frame_png

        // You might want to introduce a delay to control the frame capture rate
        await page.waitForTimeout(1000); // 1 second delay
    }

    // Close the browser when done
    await browser.close();
}

// Start watching the video stream
watchVideoStream(url);