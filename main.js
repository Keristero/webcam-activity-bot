const puppeteer = require('puppeteer');
const path = require('path')
const pixelmatch = require('pixelmatch')
const PNG = require('pngjs').PNG;
const { createCanvas, loadImage } = require('canvas')
const { Client, GatewayIntentBits,AttachmentBuilder,EmbedBuilder } = require('discord.js');
const environment = require('./environment')

const url = `http://server.quotro.net:2583/`
const out_folder = './out'
const fs = require('fs')
const token = environment.DISCORD_TOKEN
const channelId = '272616531295469568';
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
let record_time = 0

function sendDiscordMessage(imagebuffer){
    try{
        const file = new AttachmentBuilder(imagebuffer);
        const embed = new EmbedBuilder()
        .setTitle('Movement Detected')
        channel.send({embeds:[embed],files:[file]});
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

function saveFrame(image, frame_no, output_folder) {
    return new Promise((resolve, reject) => {
        let new_png = new PNG({
            width: image.width,
            height: image.height
        });
        new_png.data = image.data;
        let file_name = generateFilenameWithTimestamp('arthur','.png')
        let new_file_path = path.join(output_folder, file_name)
        new_png.pack().pipe(fs.createWriteStream(new_file_path)).on("finish", function () {
            resolve()
        });
    })
}

// Main function to watch the video stream
async function watchVideoStream(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the webpage with the video stream
    await page.goto(url);

    // Main loop to capture frames and check for movement
    while (true) {
        // Capture the current frame
        const frame = await page.screenshot({ encoding: 'base64' });
        
        // Convert the base64-encoded frame to a Mat object (OpenCV.js)
        const buffer = Buffer.from(frame, 'base64');
        let frame_png = PNG.sync.read(buffer);

        // Check for movement
        if (detectMovement(frame_png)) {
            console.log('Movement detected!');
            saveFrame(frame,frame_no++,out_folder)
            sendDiscordMessage(buffer)
            // Perform any action when movement is detected
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