const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const startScreen = document.getElementById("startScreen");
const gameUI = document.getElementById("gameUI");
const gameOverScreen = document.getElementById("gameOverScreen");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const livesEl = document.getElementById("lives");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");
const questionEl = document.getElementById("question");
const finalScoreEl = document.getElementById("finalScore");
const gameOverTitleEl = document.getElementById("gameOverTitle");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameModeSelect = document.getElementById("gameMode");
const sinkSpeedSelect = document.getElementById("sinkSpeed");
const tableLevelSelect = document.getElementById("tableLevel");

let gameRunning = false;

let score = 0;
let coins = 0;
let lives = 3;
let step = 1;
let level = 1;
let gameMode = "original";
let sinkSpeed = 0.7;
let trainingEnd = 0;
let trainingQueue = [];
let trainingQuestion = null;
let testQueue = [];
let testRangeStart = 1;
let testComplete = false;

let highScore =
Number(localStorage.getItem("mathCatHighScore") || 0);

highScoreEl.textContent = highScore;

const cat = {
    x: canvas.width / 2,
    y: canvas.height - 120 - 18,
    radius: 18,
    moving: false,
    targetX: 0,
    targetY: 0
};

let currentPlatform = {
    x: canvas.width / 2 - 70,
    y: canvas.height - 120,
    w: 140,
    h: 20
};
let landedPlatform = currentPlatform;

let leftPlatform = null;
let rightPlatform = null;

let particles = [];

function updateHUD() {

    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    livesEl.textContent = "❤️".repeat(lives);
    highScoreEl.textContent = highScore;
    levelEl.textContent = `${level} (×${level} table)`;
}

function createQuestion() {
    const table = level;

    let questionStep = step;

    if(gameMode === "training"){
        if(trainingQueue.length === 0){
            const firstNewStep = trainingEnd + 1;
            trainingEnd += 5;
            for(let nextStep = firstNewStep; nextStep <= trainingEnd; nextStep++){
                trainingQueue.push({ step: nextStep, successes: 0 });
            }
        }

        trainingQuestion = trainingQueue.shift();
        questionStep = trainingQuestion.step;
    } else if(gameMode === "test"){
        if(testQueue.length === 0){
            if(testRangeStart > 20){
                testComplete = true;
                endGame();
                return;
            }

            testQueue = Array.from(
                { length: 10 },
                (_, index) => testRangeStart + index
            );

            for(let index = testQueue.length - 1; index > 0; index--){
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [testQueue[index], testQueue[randomIndex]] =
                    [testQueue[randomIndex], testQueue[index]];
            }

            testRangeStart += 10;
        }

        questionStep = testQueue.shift();
    }

    const correct = table * questionStep;

    let wrong;

    do {
        wrong =
        correct +
        Math.floor(Math.random() * 10) + 1;
    }
    while(wrong === correct);

    const leftCorrect =
        Math.random() < 0.5;

    const centerX = canvas.width / 2;
    const platformSpacing = Math.min(170, (canvas.width - 140) / 2);

    const centerY =
        canvas.height / 2 - 100;

    leftPlatform = {
        x: centerX - platformSpacing - 60,
        y: centerY,
        w: 120,
        h: 20,
        answer:
            leftCorrect
            ? correct
            : wrong,
        correct: leftCorrect
    };

    rightPlatform = {
        x: centerX + platformSpacing - 60,
        y: centerY,
        w: 120,
        h: 20,
        answer:
            leftCorrect
            ? wrong
            : correct,
        correct: !leftCorrect
    };

    questionEl.textContent =
        `${table} × ${questionStep} = ?`;
}

function spawnParticles() {

    for(let i=0;i<20;i++){

        particles.push({

            x: cat.x,
            y: cat.y,

            vx:
            (Math.random()-0.5)*5,

            vy:
            (Math.random()-0.5)*5,

            life: 25

        });
    }
}

function drawParticles(){

    particles.forEach(p=>{

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.fillStyle =
        "gold";

        ctx.fillRect(
            p.x,
            p.y,
            4,
            4
        );
    });

    particles =
        particles.filter(
            p=>p.life>0
        );
}

function drawPlatform(p,color){

    if(!p) return;

    ctx.fillStyle = color;

    ctx.fillRect(
        p.x,
        p.y,
        p.w,
        p.h
    );

    if(p.answer !== undefined && landedPlatform !== p){
        ctx.font = "bold 20px Arial";
        const labelWidth = Math.max(64, ctx.measureText(String(p.answer)).width + 20);
        const labelHeight = 18;
        const labelX = p.x + (p.w - labelWidth) / 2;
        const labelY = p.y + (p.h - labelHeight) / 2;

        ctx.fillStyle = "rgba(20, 35, 55, 0.88)";
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 8);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.answer, p.x + p.w / 2, labelY + labelHeight / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
}

function drawCat(){

    ctx.save();

    ctx.translate(cat.x, cat.y);

    ctx.fillStyle =
    "#ffb347";

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        cat.radius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12,-12);
    ctx.lineTo(-22,-30);
    ctx.lineTo(-4,-15);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12,-12);
    ctx.lineTo(22,-30);
    ctx.lineTo(4,-15);
    ctx.fill();

    ctx.fillStyle = "black";

    ctx.beginPath();
    ctx.arc(-6,-2,2,0,7);
    ctx.arc(6,-2,2,0,7);
    ctx.fill();

    ctx.restore();
}

function choose(platform){

    if(!gameRunning) return;
    if(cat.moving) return;

    const answeredCorrectly = platform.correct;

    if(gameMode === "training"){
        const card = trainingQuestion;
        if(answeredCorrectly){
            card.successes++;
        } else {
            lives--;
        }

        if(card.successes < 5){
            const repeatGap = Math.max(1, card.successes);
            // Queue position represents the number of other questions to
            // answer before this fact returns. This also avoids due-time ties.
            const insertionIndex = Math.min(repeatGap, trainingQueue.length);
            trainingQueue.splice(insertionIndex, 0, card);
        }

        if(lives <= 0){
            updateHUD();
            endGame();
            return;
        }
    } else if(!answeredCorrectly){
        lives--;
        updateHUD();
        if(lives <= 0)
            endGame();
        return;
    }

    if(answeredCorrectly){
        score++;
        coins += 5;
        if(gameMode === "original")
            step++;

        spawnParticles();

        if(score > highScore){

            highScore = score;

            localStorage.setItem(
                "mathCatHighScore",
                highScore
            );
        }
    }

    // Training mode lets a wrong answer continue the run, while scheduling
    // that fact again after the same gap. Original mode keeps its old behavior.
    cat.targetX = platform.x + platform.w / 2;
    cat.targetY = platform.y - cat.radius;
    cat.moving = true;
    currentPlatform = platform;

    updateHUD();
}

function endGame(){

    gameRunning = false;
    gameOverTitleEl.textContent = testComplete ? "Test Complete!" : "Game Over";

    finalScoreEl.textContent =
        score;

    gameOverScreen.style.display =
        "flex";
}

startBtn.onclick = ()=>{

    gameMode = gameModeSelect.value;
    level = Number(tableLevelSelect.value);
    sinkSpeed = Number(sinkSpeedSelect.value);
    step = 1;
    updateHUD();
    if(gameMode === "training"){
        trainingEnd = 0;
        trainingQueue = [];
        trainingQuestion = null;
    }
    if(gameMode === "test"){
        testQueue = [];
        testRangeStart = 1;
        testComplete = false;
    }

    startScreen.style.display =
        "none";

    gameUI.style.display =
        "block";

    gameRunning = true;

    createQuestion();
};

restartBtn.onclick = ()=>{
    location.reload();
};

document
.getElementById("leftBtn")
.onclick = ()=>
choose(leftPlatform);

document
.getElementById("rightBtn")
.onclick = ()=>
choose(rightPlatform);

document.addEventListener(
    "keydown",
    e=>{

        if(e.key==="ArrowLeft")
            choose(leftPlatform);

        if(e.key==="ArrowRight")
            choose(rightPlatform);
    }
);

let touchStartX = 0;

canvas.addEventListener(
    "touchstart",
    e=>{

        touchStartX =
        e.touches[0].clientX;
    }
);

canvas.addEventListener(
    "touchend",
    e=>{

        const diff =
        e.changedTouches[0]
        .clientX -
        touchStartX;

        if(diff < -40){

            choose(leftPlatform);
        }

        if(diff > 40){

            choose(rightPlatform);
        }
    }
);

function update(){

    if(!gameRunning) return;

    // The chosen platform is also currentPlatform. Sink each platform only
    // once so it does not move twice after the cat chooses it.
    const sinkingPlatforms = new Set([
        currentPlatform,
        leftPlatform,
        rightPlatform
    ]);

    sinkingPlatforms.forEach(platform => {
        if(platform)
            platform.y += sinkSpeed;
    });

    if(cat.moving){

        // The destination platform sinks during the jump, so track its
        // current top edge instead of the position it had when selected.
        cat.targetY = currentPlatform.y - cat.radius;

        cat.x +=
        (cat.targetX-cat.x)*0.12;

        cat.y +=
        (cat.targetY-cat.y)*0.12;

        const dx =
        Math.abs(
        cat.targetX-cat.x
        );

        const dy =
        Math.abs(
        cat.targetY-cat.y
        );

        // The cat follows the sinking platform smoothly, so allow for the
        // small tracking lag before snapping it onto the platform surface.
        if(dx < 2 && dy < 8){

            // Align the cat's feet exactly with the platform surface.
            cat.x = currentPlatform.x + currentPlatform.w / 2;
            cat.y = currentPlatform.y - cat.radius;
            landedPlatform = currentPlatform;

            cat.moving = false;

            createQuestion();
        }

    } else {

        cat.y +=
        sinkSpeed;
    }

    if(cat.y >
       canvas.height + 50){

        endGame();
    }
}

function drawBackground(){

    let color =
    "#87ceeb";

    if(score > 15)
        color="#f4b183";

    if(score > 30)
        color="#2c3e50";

    ctx.fillStyle=color;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

function draw(){

    drawBackground();

    drawPlatform(
        currentPlatform,
        "#8B5A2B"
    );

    drawPlatform(
        leftPlatform,
        "#3498db"
    );

    drawPlatform(
        rightPlatform,
        "#9b59b6"
    );

    drawCat();

    drawParticles();
}

function loop(){

    update();

    draw();

    requestAnimationFrame(loop);
}

updateHUD();
loop();

window.addEventListener(
    "resize",
    ()=>{

        canvas.width =
        window.innerWidth;

        canvas.height =
        window.innerHeight;
    }
);
