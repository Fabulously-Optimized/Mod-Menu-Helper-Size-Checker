// Load characters tables
let defaultCharacterTable
let request1 = new XMLHttpRequest()
request1.open('GET', '{{ site.baseurl }}/../assets/font/default.json')
request1.responseType = 'text'
request1.send()
request1.onload = function () {
    defaultCharacterTable = JSON.parse(request1.response)
}

let altCharacterTable
let request2 = new XMLHttpRequest()
request2.open('GET', '{{ site.baseurl }}/../assets/font/alt.json')
request2.responseType = 'text'
request2.send()
request2.onload = function () {
    altCharacterTable = JSON.parse(request2.response)
}

async function getImageFromText(text, renderParams) {
    let characters = []
    let textWidth = 0
    for (let character of text) {
        let { file, row, col, characterSize } = getCharacterPosition(character, renderParams.font, renderParams.bold)
        let { canvas, characterPara } = await getCharacterImage(file, row, col, characterSize, renderParams)
        characters.push({ canvas, characterPara })
        textWidth += characterPara.width * characterPara.scaleRatio
    }
    return { characters, textWidth }
}

function getCharacterPosition(character, font, bold) {
    let unicodeNumber = character.charCodeAt(0).toString(16).padStart(4, "0")
    let row, col, characterTable

    if (font == 1) return getCharacterPositionUnicode(unicodeNumber)
    else if (font == 2) characterTable = altCharacterTable
    else characterTable = defaultCharacterTable

    if (unicodeNumber == "0020") {
        if (bold) return { file: "space", row: 0, col: 0, characterSize: { width: 10, height: 1 } }
        else return { file: "space", row: 0, col: 0, characterSize: { width: 8, height: 1 } }
    }


    for (provider of characterTable.providers) {
        row = -1
        for (let line of provider.chars) {
            col = -1
            row++
            for (character of line) {
                col++
                if (character.charCodeAt(0).toString(16).padStart(4, "0") == unicodeNumber) {
                    let file = provider.file.replace(/minecraft:/, "{{ site.baseurl }}/../assets/")
                    let characterSize = provider.characterSize
                    return { file, row, col, characterSize }
                }
            }
        }
    }
    return getCharacterPositionUnicode(unicodeNumber)
}

function getCharacterPositionUnicode(unicodeNumber) {
    if (unicodeNumber == "0020") return { file: "space", row: 0, col: 0, characterSize: { width: 8, height: 1 } }
    let file = `{{ site.baseurl }}/../assets/font/unicode_page_${unicodeNumber.substr(0, 2)}.png`
    let row = parseInt(unicodeNumber[2], 16)
    let col = parseInt(unicodeNumber[3], 16)
    let characterSize = { width: 16, height: 16, ascent: 11, unicode: true }
    return { file, row, col, characterSize }
}

async function getCharacterImage(file, row, col, characterSize, renderParams) {
    var canvas = document.createElement("canvas")
    var ctx = canvas.getContext('2d')
    canvas.width = characterSize.width + 1 + 1
    canvas.height = characterSize.height + 1

    if (file == "space") return { canvas, characterPara: { width: characterSize.width, scaleRatio: 1, ascent: 0 } }

    let img = new Image()
    await new Promise((resolve) => {
        img.onload = () => resolve()
        img.src = file
    })

    let characterStart = 1000
    let characterEnd = -1000

    rgbColor = renderParams.color.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
        , (m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16))

    ctx.drawImage(img, col * characterSize.width, row * characterSize.height, characterSize.width, characterSize.height, 1, 0, characterSize.width, characterSize.height)
    for (let i = 0; i < characterSize.width; i++) {
        for (let j = 0; j < characterSize.height; j++) {

            // render the pixel in the specified color
            if (ctx.getImageData(i, j, 1, 1).data[0] == 255) {
                let imageData = ctx.getImageData(i, j, 1, 1)
                imageData.data[0] = rgbColor[0]
                imageData.data[1] = rgbColor[1]
                imageData.data[2] = rgbColor[2]
                imageData.data[3] = 255
                ctx.putImageData(imageData, i, j)
            }

            // render bold
            if (renderParams.bold && ctx.getImageData(i + 1, j, 1, 1).data[0] == 255) {
                let imageData = ctx.getImageData(i, j, 1, 1)
                imageData.data[0] = rgbColor[0]
                imageData.data[1] = rgbColor[1]
                imageData.data[2] = rgbColor[2]
                imageData.data[3] = 255
                ctx.putImageData(imageData, i, j)
            }

            if (ctx.getImageData(i, j, 1, 1).data[0] == rgbColor[0]) {
                if (i > characterEnd) characterEnd = i
                if (i < characterStart) characterStart = i
                // render the shadow
                /*if (renderParams.shadow && ctx.getImageData(i + 1, j + 1, 1, 1).data[3] == 0) {
                    let imageData = ctx.getImageData(i, j, 1, 1)
                    imageData.data[0] = 62
                    imageData.data[1] = 62
                    imageData.data[2] = 62
                    imageData.data[3] = 255
                    ctx.putImageData(imageData, i + 1, j + 1)
                }*/
            }
        }
    }

    // ctx.drawImage(img, col*characterSize.width, row*characterSize.height, characterSize.width, characterSize.height, 0, 0, characterSize.width, characterSize.height)
    let characterPara = { width: characterEnd - characterStart, scaleRatio: Math.ceil(48 / characterSize.width), ascent: characterSize.ascent }

    // Remove characterStart pixels on the left
    if (Math.abs(characterStart) < 999) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(tempCanvas, characterStart, 0, canvas.width - characterStart, canvas.height, 0, 0, canvas.width - characterStart, canvas.height)
        if (characterStart > 1) characterPara.width -= 1
    }


    if (characterSize.unicode) characterPara.width += 3
    else characterPara.width += 2 // At least one pixel + shadow

    return { canvas, characterPara }
}