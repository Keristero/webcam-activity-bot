# purpose
Discord bot which watches a website every second and compares the number of visually changed pixels (activity), when it exceeds a threshhold it notifies your channel with a screenshot, and records a gif of the activity - which is sent once the activity is finished.

Also supports scaring cats with `/spook` via connected speaker.

# How to use
...dont
This is very hardcoded for my use, it expects an environment.js

```js
let environment = {
    DISCORD_TOKEN:`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
    CHANNEL_ID:`xxxxxxxxxxxxxxxxx`,
    DEBUG_CHANNEL_ID:`xxxxxxxxxxxxxxxx`,
    WEBSITE_URL:`http://thisisthewebsiteyouwanttowatch.com`,
    DEBUG_MODE:false,//just prints to a different channel while testing
    OUT_FOLDER:`./out`//where to save gifs/screenshots before sending
}

module.exports = environment
```

the rest of the configuration is hardcoded in main.js currently