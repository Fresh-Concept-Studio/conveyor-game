class MyGame extends Phaser.Scene {
    constructor() {
        super({ key: 'MyGame' });
        this.isGameOver = false; // Add this line
        this.levelWidth = 25080;
        this.scrollSpeed = 0.45;
        this.playerSpeed = 350;
        this.enemySpeed = 300;
        this.isSuperJump = false;
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.tilemapTiledJSON('map', 'level1.json');
        this.load.image('tiles', 'assets/tileset.png');
        this.load.image('invisibleTexture', 'assets/transparent.png');

        this.load.image('enemy', 'assets/enemy.png');
        this.load.spritesheet('enemySpriteSheet', 'assets/enemy-squash.png', {
            frameWidth: 120, // Width of each frame in the spritesheet
            frameHeight: 120, // Height of each frame
            endFrame: 4 // Optional: number of the last frame in the spritesheet
        });

        this.load.spritesheet('playerRun', 'assets/playerRun.png', { frameWidth: 86, frameHeight: 120 });
        this.load.spritesheet('playerJump', 'assets/playerJump.png', { frameWidth: 86, frameHeight: 120 });
    }

    create() {
        this.cameras.main.backgroundColor.setTo(0, 176, 235);
        const map = this.make.tilemap({ key: 'map', tileWidth:120, tileHeight:120 });
        const tileset = map.addTilesetImage('Assets', 'tiles');
        const landscape = map.createLayer('Landscape', tileset, 0, 0);
        const landscape_background_2 = map.createLayer('Landscape - Background 2', tileset, 0, 0);
        const landscape_background_3 = map.createLayer('Landscape - Background 3', tileset, 0, 0);
        const landscape_background_1 = map.createLayer('Landscape - Background 1', tileset, 0, 0);
        this.enemyColliders = this.physics.add.staticGroup();
        this.groundColliders = this.physics.add.staticGroup();
        this.enemyColliderLayer = map.getObjectLayer('Enemy Edge Colliders').objects;
        this.groundColliderLayer = map.getObjectLayer('Ground Colliders').objects;

        this.enemyColliderLayer.forEach(object => {
            // Create a sprite or an image for each object in the layer
            this.enemyColliders.create(object.x, object.y, 'invisibleTexture')
                .setSize(object.width, object.height)
                .setOffset(object.width/2, object.height/2) // Offset may need to be adjusted based on your needs
                .setVisible(false); // Set to true if you want to see the colliders for debugging
        });

        this.groundColliderLayer.forEach(object => {
            // Create a sprite or an image for each object in the layer
            this.groundColliders.create(object.x, object.y, 'invisibleTexture')
                .setSize(object.width, object.height)
                .setOffset(60, 60) // Offset may need to be adjusted based on your needs
                .setVisible(false); // Set to true if you want to see the colliders for debugging
        });


        // Define the size of your game world
        this.physics.world.setBounds(0, 0, this.levelWidth, this.game.config.height);


        this.player = this.physics.add.sprite(300, 800, 'player');
        this.player.setVelocityX(this.playerSpeed);
        // this.player.setScale(1);

        this.physics.add.collider(this.player, this.groundColliders, null, function(player, collider) {
            if (player.body.bottom <= collider.body.top + 15) {
                // The player is moving downwards and is above the collider - allow collision
                return true;
            } else {
                // debugger;
                // Disable collision from the sides or when moving up through the collider
                return false;
            }
        }, this);



        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
        this.scoreText.setScrollFactor(0);



        // Enemy Spawn Placeholders
        this.enemySpawnPoints = [];
        const enemiesLayer = map.getLayer('EnemiesSpawn').data;
        enemiesLayer.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.index > -1) { // If there is a tile here, it's a spawn point
                    const point = {
                        x: x * map.tileWidth + map.tileWidth / 2,
                        y: y * map.tileHeight + map.tileHeight / 2
                    };
                    this.enemySpawnPoints.push(point);
                }
            });
        });

        // Initialize an empty group for enemies
        this.enemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite
        });



        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemies, this.groundColliders);
        this.physics.add.collider(this.enemies, this.enemyColliders, this.enemyTurnAround, null, this);


        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.game.config.height); // Match the world bounds

        this.anims.create({
            key: 'enemySquash',
            frames: this.anims.generateFrameNumbers('enemySpriteSheet', { start: 0, end: 3 }), // Adjust frame numbers
            frameRate: 20,
            repeat: 0 // No repeat
        });

        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('playerRun', { start: 0, end: 7 }), // Replace [last frame index] with the actual last frame index
            frameRate: 13,
            repeat: -1 // -1 means the animation loops forever
        });

        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('playerJump', { start: 0, end: 2 }), // Replace [last frame index] with the actual last frame index
            frameRate: 13,
            repeat: 0 // -1 means the animation loops forever
        });
    }

    update(time, delta) {
        if (!this.isGameOver) {
            // this.player.x += this.scrollSpeed * delta;

            if (this.player.y > this.physics.world.bounds.height + 120) {
                this.gameOver();
            }

            if (this.player.body.blocked.down) {
                this.player.anims.play('run', true); // Play the running animation
            } else {
                this.resetPlayerSpeed();
                // If in the air, you might want to stop the animation or switch to a jumping/falling animation
                this.player.anims.stop();
                this.player.anims.play('jump', true);
            }

            const camera = this.cameras.main;

            // Filter out spawn points that are within 120 pixels of the camera view
            this.enemySpawnPoints = this.enemySpawnPoints.filter(point => {
                const withinHorizontalBounds = point.x >= camera.scrollX - 120 && point.x <= camera.scrollX + camera.width + 120;
                const withinVerticalBounds = point.y >= camera.scrollY - 120 && point.y <= camera.scrollY + camera.height + 120;

                // If the spawn point is within bounds, spawn the enemy and return false so it's removed
                if (withinHorizontalBounds && withinVerticalBounds) {
                    const enemy = this.enemies.create(point.x, point.y, 'enemy');
                    enemy.setScale(1);
                    enemy.setVelocityX(-200); // Initialize your enemy as needed
                    return false;
                }

                return true; // Keep this spawn point for later checks
            });
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && this.player.body.blocked.down) {
            this.player.setVelocityY(-350); // Initial jump velocity
            this.jumpStartTime = time; // Record the time when the jump started
        } else if (this.cursors.space.isDown && !this.player.body.touching.down) {
            // Check if the key is still down and the player is in the air
            if (time - this.jumpStartTime < 500) { // 150 ms to check for a hold, adjust as needed
                this.player.setVelocityY(-550); // Apply additional jump force
            }
        }
    }

    hitEnemy(player, enemy) {
        // Check if the enemy has already been hit
        if (enemy.hasBeenHit) {
            // Enemy has already been hit, so do nothing
            return;
        }

        if (player.body.bottom < enemy.body.top + 10) {
            // Mark the enemy as having been hit
            enemy.hasBeenHit = true;
            this.resetPlayerSpeed();
            this.player.setVelocityY(-350); // Initial jump velocity
            enemy.play('enemySquash');
            enemy.setVelocityX(0);
            enemy.on('animationcomplete', () => {
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);
                setTimeout(() => {
                   enemy.disableBody(true, true);
                }, 1000); // Removed quotes around the timeout duration to ensure it's treated as a number
            }, this);
        } else {
            this.gameOver();
        }
    }

    resetPlayerSpeed() {
        this.player.setVelocityX(this.playerSpeed);
    }


    enemyTurnAround(enemy, trigger) {
        if(trigger.body.bottom == enemy.body.bottom) {
            if (enemy.flipX) {
                enemy.flipX = false;
                enemy.setVelocityX(-200);
            } else {
                enemy.flipX = true;
                enemy.setVelocityX(200);
            }
        }
    }

    gameOver() {
        console.log('Game Over');
        this.isGameOver = true; // Indicate the game is over

        // Remove the tint and apply rotation
        this.player.clearTint();
        this.player.setAngle(-90); // Rotate 90 degrees counter clockwise
        this.player.setVelocityX(-40);
        this.player.anims.stop();
        this.player.y += -40;
        this.player.setTint(0xff0000);
        Phaser.Actions.Call(this.enemies.getChildren(), (enemy) => {
            enemy.setVelocityX(0);
        });
        this.scoreText.setText('Game Over! Score: ' + this.score);
        setTimeout(() => {
            this.physics.pause();
        }, 1000);
    }

}

var config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-wrap',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2000 },
            debug: false,
            deltaTime: 1 / 60,
            fps: 60,
        }
    },
    scene: MyGame
};

var game = new Phaser.Game(config);
