import 'puppeteer'
import 'path'
import 'pixelmatch'
import {PNG} from 'pngjs'
import { createCanvas, loadImage } from 'canvas'
import { Client, GatewayIntentBits,AttachmentBuilder,EmbedBuilder } from 'discord.js'
import {OUT_FOLDER,DISCORD_TOKEN,CHANNEL_ID,DEBUG_CHANNEL_ID,WEBSITE_URL,DEBUG_MODE} from './environment.js'
import gifencoderpkg from 'gifencoder';
const {GIFEncoder} = gifencoderpkg;
import 'fs'
import {playAudioFile} from 'audic'

async function playAudio(){
    await playAudioFile('spook.m4a')
}

playAudio()