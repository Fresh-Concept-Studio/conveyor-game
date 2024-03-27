var config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT, // Scale the game to fit the screen while maintaining aspect ratio
        parent: 'game-wrap',
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas in the screen
        width: 1920, // Your game's original width
        height: 1080 // Your game's original height
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload () {
    this.load.image('background', 'assets/background.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.image('ground', 'assets/ground.png');
}

var player;
var cursors;
var score = 0;
var scoreText;
const groundHeight = 110;
const scrollSpeed = 0.2;

function create () {
    var background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    var scaleWidth = this.sys.game.config.width / background.width;
    background.setScale(scaleWidth, scaleWidth);
    background.y = 0;


    this.ground = this.add.tileSprite(0, game.config.height, game.config.width, groundHeight, 'ground').setOrigin(0, 1);
    this.physics.add.existing(this.ground, true);
    this.ground.body.setSize(game.config.width, groundHeight, true);

    // Adding the player
    player = this.physics.add.sprite(300, 800, 'player');
    player.setScale(0.5);
    player.setBounce(0.2); // Makes the player bounce slightly
    player.setCollideWorldBounds(true); // Prevents the player from leaving the canvas
    this.physics.add.collider(player, this.ground);


    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });


    // Initial spawn delay
    this.nextEnemySpawn = 2000; // milliseconds (2 seconds initially)
    this.time.addEvent({
        delay: this.nextEnemySpawn,
        callback: () => this.spawnEnemy(), // Arrow function maintains `this` context
        callbackScope: this
    });

    // Call `increaseSpawnRate` every minute to make the game harder
    this.time.addEvent({
        delay: 10000, // 60000ms = 1 minute
        callback: increaseSpawnRate,
        callbackScope: this,
        loop: true
    });

    // Adding enemies (example with one enemy)
    this.enemy = this.physics.add.sprite(2020, 800, 'enemy');
    this.enemy.setScale(0.5);
    this.physics.add.collider(this.enemy, this.ground);
    this.physics.add.collider(player, this.enemy, hitEnemy, null, this);


    // Player controls
    cursors = this.input.keyboard.createCursorKeys();
    cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // Add spacebar input
}

function update (time, delta) {
    this.ground.tilePositionX += scrollSpeed * delta;
    this.enemy.x -= scrollSpeed * delta;
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
    } else {
        player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.space) && player.body.touching.down) {
        player.setVelocityY(-750); // Adjust velocity for a shorter jump
    }
}

function increaseSpawnRate() {
    // Decrease spawn delay to make the game harder
    this.nextEnemySpawn = Math.max(500, this.nextEnemySpawn - 100); // Ensure delay doesn't go below 500ms
}

function spawnEnemy() {
    // Spawn an enemy
    this.enemy = this.physics.add.sprite(2020, 800, 'enemy'); // Adjust as necessary
    this.enemy.setScale(0.5);
    this.physics.add.collider(this.enemy, this.ground);
    this.physics.add.collider(player, this.enemy, hitEnemy, null, this);

    // Schedule next enemy spawn
    this.time.addEvent({
        delay: this.nextEnemySpawn,
        callback: () => this.spawnEnemy(), // Arrow function maintains `this` context
        callbackScope: this
    });
}

function hitEnemy(player, enemy) {
    if (player.body.bottom < enemy.body.top + 20) {
        enemy.disableBody(true, true);
        score += 10;
        scoreText.setText('Score: ' + score);
    } else {
        // Game over
        gameOver.call(this);
    }
}

function gameOver() {
    this.physics.pause();
    this.scene.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    scoreText.setText('Game Over! Score: ' + score);

    // Restart the game after a delay
    setTimeout(function () {
        this.scene.restart();
    }.bind(this), 3000); // Ensure 'this' is bound to the Phaser scene
}

