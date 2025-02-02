document.addEventListener('DOMContentLoaded', () => {
    // --- Canvas Setup ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const uhohSound = document.getElementById('uhoh');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // --- Ball Class ---
    class Ball {
        constructor(x, y, radius, velocityX, velocityY, color) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.velocityX = velocityX;
            this.velocityY = velocityY;
            this.gravity = 0.4;
            this.bounce = 0.85;
            this.color = color;
            this.isDragged = false;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        checkDrag(mouseX, mouseY) {
            // Returns true if the mouse/touch is within the ball's radius.
            return Math.hypot(mouseX - this.x, mouseY - this.y) < this.radius;
        }

        drag(mouseX, mouseY) {
            if (this.isDragged) {
                this.x = mouseX;
                this.y = mouseY;
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }

        update() {
            // Skip physics if being dragged.
            if (this.isDragged) return;

            // If ball is on the ground and nearly still, lock it in place.
            if (this.y + this.radius >= canvas.height &&
                Math.abs(this.velocityY) < 0.5 &&
                Math.abs(this.velocityX) < 0.5) {
                this.y = canvas.height - this.radius;
                this.velocityX = 0;
                this.velocityY = 0;
                return;
            }

            // Apply gravity and update positions.
            this.velocityY += this.gravity;
            this.y += this.velocityY;
            this.x += this.velocityX;

            // Ground collision
            if (this.y + this.radius > canvas.height) {
                this.y = canvas.height - this.radius;
                this.velocityY *= -this.bounce;
            }

            // Wall collisions
            if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
                this.velocityX *= -0.8;
                this.x = Math.max(this.radius, Math.min(this.x, canvas.width - this.radius));
            }
        }
    }

    // --- Helper Functions ---
    function getEventPos(e) {
        // Supports both mouse and touch events.
        return e.touches
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };
    }

    function randomColor() {
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }

    function createNewBalls(ball) {
        // Create two new balls at the current ball's location.
        return [
            new Ball(
                ball.x - 20,
                ball.y,
                ball.radius * 0.8,
                -2,
                ball.velocityY * ball.bounce,
                randomColor()
            ),
            new Ball(
                ball.x + 20,
                ball.y,
                ball.radius * 0.8,
                2,
                ball.velocityY * ball.bounce,
                randomColor()
            )
        ];
    }

    // --- Image Setup ---
    const leandroImg = new Image();
    leandroImg.src = 'leandro.png';

    function drawLeandro() {
        const imgSize = 300;
        const x = (canvas.width - imgSize) / 2;
        const y = (canvas.height - imgSize) / 2;
        ctx.drawImage(leandroImg, x, y, imgSize, imgSize);
    }

    // --- Drag and Selection Handling ---
    const selectAllBtn = document.getElementById('selectAllBtn');
    let allBallsSelected = false;

    // Toggle selection state for all balls
    selectAllBtn.addEventListener('click', () => {
        allBallsSelected = !allBallsSelected;
        selectAllBtn.style.background = allBallsSelected 
            ? 'rgba(255, 100, 100, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)';
        // Set or clear the drag flag on all balls.
        balls.forEach(ball => ball.isDragged = allBallsSelected);
    });

    function handleStart(e) {
        e.preventDefault();
        const pos = getEventPos(e);
        // If not selecting all, check for a ball hit.
        if (!allBallsSelected) {
            balls.forEach(ball => {
                ball.isDragged = ball.checkDrag(pos.x, pos.y);
            });
        }
    }

    function handleMove(e) {
        e.preventDefault();
        const pos = getEventPos(e);
        // If all balls are selected, or any ball is being dragged, update positions.
        if (allBallsSelected || balls.some(ball => ball.isDragged)) {
            balls.forEach(ball => {
                if (allBallsSelected || ball.isDragged) {
                    ball.x = pos.x;
                    ball.y = pos.y;
                    ball.velocityX = 0;
                    ball.velocityY = 0;
                }
            });
        }
    }

    function handleEnd(e) {
        e.preventDefault();
        // If not in select-all mode, release dragged balls.
        if (!allBallsSelected) {
            balls.forEach(ball => ball.isDragged = false);
        }
    }

    // Add both mouse and touch event listeners.
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);

    // --- Game Loop and Ball Management ---
    let balls = [new Ball(canvas.width / 2, 50, 35, 0, 0, '#ff4444')];
    let isAnimating = false;
    let lastGroundHit = 0;

    const toggleInfiniteBtn = document.getElementById('toggleInfiniteBtn');
    let infiniteSpawning = false;

    toggleInfiniteBtn.addEventListener('click', () => {
        infiniteSpawning = !infiniteSpawning;
        toggleInfiniteBtn.style.background = infiniteSpawning 
            ? 'rgba(100, 255, 100, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)';
    });

    function update() {
        if (!isAnimating) return;

        // Clear canvas and draw background image.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawLeandro();

        let newBalls = [];

        // Update and draw balls.
        balls.forEach(ball => {
            ball.update();
            ball.draw();

            // If the ball touches the ground, create new balls.
            if (ball.y + ball.radius >= canvas.height && (infiniteSpawning || balls.length < 5000)) {
                newBalls.push(...createNewBalls(ball));
                if (Date.now() - lastGroundHit > 500) {
                    uhohSound.play();
                    lastGroundHit = Date.now();
                }
            }
        });

        // Add newly created balls.
        balls.push(...newBalls);

        // Remove balls that have become too small.
        balls = balls.filter(ball => ball.radius >= 5);

        requestAnimationFrame(update);
    }

    // --- Start Animation on Canvas Click ---
    canvas.addEventListener('click', () => {
        if (!isAnimating) {
            balls = [new Ball(canvas.width / 2, 20, 25, 0, 0, '#ff4444')];
            isAnimating = true;
            update();
        }
    });

    // --- Initial Draw ---
    leandroImg.onload = () => {
        drawLeandro();
        // Draw the initial ball (if any) after the image loads.
        if (balls.length > 0) {
            balls[0].draw();
        }
    };
});
