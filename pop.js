"use strict";

// Constants.
const lengthOfFile = 8;
const minutesLeftOffset = 0;
const secondsLeftOffset = 2;
const levelOffset = 4;
const healthOffset = 6;

let defaultFileBytes = Uint8Array.from(Array(lengthOfFile));
defaultFileBytes[0] = 60; // minutes
defaultFileBytes[2] = 0; // seconds
defaultFileBytes[4] = 1; // level
defaultFileBytes[6] = 3; // health

const diggerStatImageUrls = [
    "images/pop-level-1.png",
    "images/pop-level-2.png",
    "images/pop-level-3.png",
    "images/pop-level-4.png",
    "images/pop-level-5.png",
    "images/pop-level-6.png",
    "images/pop-level-7.png",
    "images/pop-level-8.png",
    "images/pop-level-9.png",
    "images/pop-level-10.png",
    "images/pop-level-11.png",
    "images/pop-level-12.png",
    "images/pop-level-13.png",
    "images/pop-level-14.png"
]

const torchLocationsPerLevel = [
    [43, 68, 75, 68],
    [75, 68, 171, 68],
    [267, 131],
    [43, 68, 171, 68, 267, 68],
    [43, 131, 267, 131],
    [43, 68, 139, 68],
    [267, 131],
    [],
    [],
    [75 + 32, 68, 171 + 32, 68],
    [267, 68],
    [75 + 32, 131, 171 + 32, 131],
    [],
    [43, 68, 75 + 32, 68, 171 + 32, 68, 267, 68],
]

// References to parts of the page.
const downloadButton = document.querySelector("#download-file");
const resetButton = document.querySelector("#reset-form");
const getLevelImage = () => document.querySelector("#pop-level-img");
const fileUploadInput = document.querySelector("#level-upload");
const newFileInputs = document.querySelectorAll(".new-file");
const imageContainer = document.querySelector(".image-container");


// Fields.
const fieldMinutes = document.querySelector("#minutes");
const fieldSeconds = document.querySelector("#seconds");
const fieldLevel = document.querySelector("#level");
const fieldHealth = document.querySelector("#health");

// Variables.
let isEditingFile = false;
let originalFileBytes = [];
let modifiedFileBytes = [];
let currentLevel = 0;
let currentHealth = 0;

// Event listeners.
downloadButton.addEventListener('click', onDownload);
resetButton.addEventListener('click', onResetChanges);
fieldMinutes.addEventListener('change', onMinutesLeftChanged);
fieldSeconds.addEventListener('change', onSecondsLeftChanged);
fieldLevel.addEventListener('change', onLevelChanged);
fieldHealth.addEventListener('change', onHealthChanged);

fileUploadInput.addEventListener('input', onUpload);
for(let i = 0; i < newFileInputs.length; i++){
    newFileInputs[i].addEventListener('click', onNew);
}

const maxTorches = 4;
// Generate all torch images, absolutely positioned. We require a maximum of 4 torches.
for(let i = 0; i < maxTorches; i++){
    const theLeft = (i + 1) * 10;
    const theTop =  (i + 1) * 10;
    imageContainer.innerHTML = "<img alt=\"\" class=\"torch\" src=\"images/torch.gif\" style=\"left: " + theLeft + "px; top: " + theTop + "px;\">" + imageContainer.innerHTML;
    console.log("Created torch.");
}

const numLevels = 14;
const numHealthBarsBeforeOverflow = 46;
const healthBarWidth = 6;
const healthBarHeight = 5;
const healthBarSpacing = 1;

// Generate all health point triangles.
for(let i = 0; i < numHealthBarsBeforeOverflow; i++){
    const theLeft = (i + 1) * 10;
    const theTop =  (i + 1) * 10;
    imageContainer.innerHTML = "<img alt=\"\" class=\"healthpoint\" src=\"images/health.png\" style=\"left: " + theLeft + "px; top: " + theTop + "px;\">" + imageContainer.innerHTML;
}

// Generate all digits. (Max 5: "65535").
for(let i = 0; i < 5; i++){
    const theLeft = (i + 1) * 10;
    const theTop =  (i + 1) * 10;
    imageContainer.innerHTML += "<div class=\"minutes\" style=\"left: " + theLeft + "px; top: " + theTop + "px;\">";
}

const healthPointImages = imageContainer.querySelectorAll(".healthpoint");
const torches = imageContainer.querySelectorAll(".torch");
const minutesLeftText = imageContainer.querySelector(".minutes-left");
const minutesTextDigits = imageContainer.querySelectorAll(".minutes");

// Functions.
function onFileChanged(n){

    // Populate form.
    if(isEditingFile){
        const minutes = modifiedFileBytes[minutesLeftOffset] + (modifiedFileBytes[minutesLeftOffset + 1] << 8);
        const seconds = modifiedFileBytes[secondsLeftOffset] + (modifiedFileBytes[secondsLeftOffset + 1] << 8);
        const level = modifiedFileBytes[levelOffset] + (modifiedFileBytes[levelOffset + 1] << 8);
        const health = modifiedFileBytes[healthOffset] + (modifiedFileBytes[healthOffset + 1] << 8);

        fieldMinutes.value = minutes;
        fieldSeconds.value = seconds;
        fieldLevel.value = level;
        fieldHealth.value = health;

        currentLevel = Math.max(0, level - 1);
        getLevelImage().src = diggerStatImageUrls[currentLevel];

        currentHealth = health;
        positionFlags();
    }
}

function onMinutesLeftChanged(e) {
    let value = parseInt(e.target.value);

    // Bound to valid uint16 values.
    if (value < 0) {
        value = 0;
    }
    if (value >= 2 ** 16) {
        value = 2 ** 16 - 1;
    }
    e.target.value = value;

    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    modifiedFileBytes[minutesLeftOffset] = b1;
    modifiedFileBytes[minutesLeftOffset + 1] = b2;

    positionFlags();
}

function onSecondsLeftChanged(e) {
    let value = parseInt(e.target.value);

    if (value < 0) {
        value = 0;
        e.target.value = value;
    }
    if (value >= 2 ** 16) {
        value = 2 ** 16 - 1;
        e.target.value = value;
    }

    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    modifiedFileBytes[secondsLeftOffset] = b1;
    modifiedFileBytes[secondsLeftOffset + 1] = b2;
}

function onLevelChanged(e) {
    let value = parseInt(e.target.value);

    if (value < 1) {
        value = 1;
        e.target.value = value;
    }
    if (value >= 16) {
        value = 15;
        e.target.value = value;
    }

    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    currentLevel = (value - 1) % numLevels
    getLevelImage().src = diggerStatImageUrls[currentLevel];

    positionFlags();

    modifiedFileBytes[secondsLeftOffset] = b1;
    modifiedFileBytes[secondsLeftOffset + 1] = b2;
}

function onHealthChanged(e) {
    let value = parseInt(e.target.value);

    if (value < 0) {
        value = 0;
        e.target.value = value;
    }
    if (value >= 2 ** 16) {
        value = 2 ** 16 - 1;
        e.target.value = value;
    }

    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    currentHealth = value;

    positionFlags();

    modifiedFileBytes[healthOffset] = b1;
    modifiedFileBytes[healthOffset + 1] = b2;
}

function onResetChanges(_){
    if(isEditingFile){
        modifiedFileBytes = Uint8Array.from(originalFileBytes);

        onFileChanged(0);
    }
}

function onDownload(_){
    if(isEditingFile){
        // https://stackoverflow.com/a/48769059
        // Change resultByte to bytes.
        const blob=new Blob([modifiedFileBytes], {type: "application/octet-stream"});

        // Create temporary element to produce a download.
        const link=document.createElement('a');
        link.href=window.URL.createObjectURL(blob);
        link.download="PRINCE.SAV";
        link.click();
    }
}

function onUpload(e) {

    if(e.target.files.length > 0){
        // https://stackoverflow.com/a/32556944
        const reader = new FileReader();
        reader.onload = function () {

            const arrayBuffer = reader.result;
            if(arrayBuffer.byteLength !== lengthOfFile){
                window.alert("Invalid file: Expected exactly " + lengthOfFile +  " bytes, got " + arrayBuffer.byteLength);
            }
            else{

                originalFileBytes = new Uint8Array(arrayBuffer);
                modifiedFileBytes = Uint8Array.from(originalFileBytes);

                console.log("loaded file. size: " + originalFileBytes.length);

                isEditingFile = true;

                document.querySelector(".all-file-based-content").style.display = "block";
                document.querySelector(".other-actions").style.display = "inline-block";
                document.querySelector("#newfilesection").style.display = "none";

                onFileChanged(0);
            }
        }
        reader.readAsArrayBuffer(e.target.files[0]);
    }
}

function onNew(_){
    originalFileBytes = Uint8Array.from(defaultFileBytes);
    modifiedFileBytes = Uint8Array.from(originalFileBytes);
    isEditingFile = true;

    document.querySelector(".all-file-based-content").style.display = "block";
    document.querySelector(".other-actions").style.display = "inline-block";
    document.querySelector("#newfilesection").style.display = "none";

    onFileChanged(0);
}

let currentScale = 1;

const originalImageWidth = 320; // And initial height is 200.
const resizeObserver = new ResizeObserver((e) => {
    if(e[0].contentRect.width === 0){
        console.log("Resize observed width change to 0, for some reason - ignoring.", e);
        return;
    }

    currentScale = e[0].contentRect.width / originalImageWidth;
    console.log("Resize detected. Scaling to: " + currentScale, currentLevel);

    getLevelImage().src = diggerStatImageUrls[currentLevel];
    // Torches and UI elements need to be scaled too.

    positionFlags();
});

function positionFlags(){

    // First, hide all torches.
    for(let i = 0; i < maxTorches; i++){
        torches[i].style.display = "none";
    }

    console.log("Level: " + currentLevel);

    let thisLevelLocations = torchLocationsPerLevel[currentLevel];
    for(let i = 0; i < thisLevelLocations.length; i += 2){
        let flag = torches[i / 2];

        console.log("flag;", flag);

        // Show this torch.
        flag.style.display = "block";

        const flagWidth = 9;
        const flagHeight = 18;

        // 10 and 21 is the origin on the flag image.
        const leftOffset = thisLevelLocations[i] * currentScale;
        const topOffset = thisLevelLocations[i + 1] * currentScale;
        const width = flagWidth * currentScale;
        const height = flagHeight * currentScale;

        flag.style.left = leftOffset + "px";
        flag.style.top = topOffset + "px";
        flag.style.width = width + "px";
        flag.style.height = height + "px";

        console.log("Setting flag for i:", i);
    }

    // Health. First, hide all.
    for(let i = 0; i < numHealthBarsBeforeOverflow; i++){
        healthPointImages[i].style.display = "none";
    }

    // Draw somewhere up to the total visible health points.
    for(let i = 0; i < Math.min(currentHealth, numHealthBarsBeforeOverflow); i++){
        let flag = healthPointImages[i];

        // Show this torch.
        flag.style.display = "block";

        // 10 and 21 is the origin on the flag image.
        const leftOffset = (healthBarWidth + healthBarSpacing) * i * currentScale;
        const topOffset = (194) * currentScale;
        const width = healthBarWidth * currentScale;
        const height = healthBarHeight * currentScale;

        flag.style.left = leftOffset + "px";
        flag.style.top = topOffset + "px";
        flag.style.width = width + "px";
        flag.style.height = height + "px";
    }

    var numDigitsVisible = fieldMinutes.value.toString().length;

    for(let i = 0; i < minutesTextDigits.length; i++){

        minutesTextDigits[i].style.display = "none";
    }

    for(let i = 0; i < numDigitsVisible; i++)
    {
        // var digits = minutesTextDigits
        // const numDigitsInMinutes = fieldMinutes.value.toString().length;

        const leftOffset = (120 + i*7 ) * currentScale;
        const topOffset = (193) * currentScale;
        const width = 6 * currentScale;
        const height = 7 * currentScale;

        minutesTextDigits[i].style.display = "block";
        minutesTextDigits[i].style.left = leftOffset + "px";
        minutesTextDigits[i].style.top = topOffset + "px";
        minutesTextDigits[i].style.width = width + "px";
        minutesTextDigits[i].style.height = height + "px";
        minutesTextDigits[i].style.backgroundSize = width + "px " + height*10 + "px";

        var digit = fieldMinutes.value.toString()[i];
        minutesTextDigits[i].style.backgroundPositionY = -(digit*7*currentScale) + "px";
    }

    {
        const leftOffset = (120 + numDigitsVisible*7 + 4) * currentScale;
        const topOffset = (193) * currentScale;
        const width = 76 * currentScale;
        const height = 7 * currentScale;

        minutesLeftText.style.left = leftOffset + "px";
        minutesLeftText.style.top = topOffset + "px";
        minutesLeftText.style.width = width + "px";
        minutesLeftText.style.height = height + "px";
    }
}

resizeObserver.observe(imageContainer);

// Get initial file (browser may have preserved this field value).
fileUploadInput.dispatchEvent(new Event('input'));
