// OrbitControls.js
// This is a simplified version of OrbitControls from three.js examples

THREE.OrbitControls = function (object, domElement) {
    this.object = object;
    this.domElement = (domElement !== undefined) ? domElement : document;

    // API
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.enableDamping = false;
    this.dampingFactor = 0.25;
    this.screenSpacePanning = false;
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.maxPolarAngle = Math.PI; // radians

    // Internal
    this.scale = 1;
    this.panOffset = new THREE.Vector3();
    this.zoomChanged = false;
    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();
    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panDelta = new THREE.Vector2();
    this.dollyStart = new THREE.Vector2();
    this.dollyEnd = new THREE.Vector2();
    this.dollyDelta = new THREE.Vector2();

    // Event handlers
    this.onMouseDown = function (event) {
        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.button === 0) {
            // Left mouse button - rotate
            this.rotateStart.set(event.clientX, event.clientY);
            document.addEventListener('mousemove', this.onMouseMove, false);
            document.addEventListener('mouseup', this.onMouseUp, false);
        } else if (event.button === 2) {
            // Right mouse button - pan
            this.panStart.set(event.clientX, event.clientY);
            document.addEventListener('mousemove', this.onMouseMove, false);
            document.addEventListener('mouseup', this.onMouseUp, false);
        }
    }.bind(this);

    this.onMouseMove = function (event) {
        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.buttons === 1) {
            // Left mouse button - rotate
            this.rotateEnd.set(event.clientX, event.clientY);
            this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
            this.rotateLeft(2 * Math.PI * this.rotateDelta.x / this.domElement.clientWidth * 0.5);
            this.rotateUp(2 * Math.PI * this.rotateDelta.y / this.domElement.clientHeight * 0.5);
            this.rotateStart.copy(this.rotateEnd);
        } else if (event.buttons === 2) {
            // Right mouse button - pan
            this.panEnd.set(event.clientX, event.clientY);
            this.panDelta.subVectors(this.panEnd, this.panStart);
            this.pan(this.panDelta.x, this.panDelta.y);
            this.panStart.copy(this.panEnd);
        }
    }.bind(this);

    this.onMouseUp = function (event) {
        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, false);
    }.bind(this);

    this.onMouseWheel = function (event) {
        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        const delta = event.deltaY;
        if (delta > 0) {
            this.dollyOut();
        } else {
            this.dollyIn();
        }
    }.bind(this);

    // Touch events
    this.touchStart = function (event) {
        if (this.enabled === false) return;

        event.preventDefault();

        switch (event.touches.length) {
            case 1: // One-fingered touch: rotate
                this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
                break;
            case 2: // Two-fingered touch: dolly
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.dollyStart.set(0, distance);
                break;
        }
    }.bind(this);

    this.touchMove = function (event) {
        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case 1: // One-fingered touch: rotate
                this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
                this.rotateLeft(2 * Math.PI * this.rotateDelta.x / this.domElement.clientWidth * 0.5);
                this.rotateUp(2 * Math.PI * this.rotateDelta.y / this.domElement.clientHeight * 0.5);
                this.rotateStart.copy(this.rotateEnd);
                break;
            case 2: // Two-fingered touch: dolly
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.dollyEnd.set(0, distance);
                this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
                if (this.dollyDelta.y > 0) {
                    this.dollyOut();
                } else if (this.dollyDelta.y < 0) {
                    this.dollyIn();
                }
                this.dollyStart.copy(this.dollyEnd);
                break;
        }
    }.bind(this);

    // Methods
    this.rotateLeft = function (angle) {
        const spherical = new THREE.Spherical().setFromVector3(this.object.position.clone().sub(this.target));
        spherical.theta -= angle;
        spherical.makeSafe();
        this.object.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(this.target));
        this.object.lookAt(this.target);
    };

    this.rotateUp = function (angle) {
        const spherical = new THREE.Spherical().setFromVector3(this.object.position.clone().sub(this.target));
        spherical.phi -= angle;
        spherical.theta = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        this.object.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(this.target));
        this.object.lookAt(this.target);
    };

    this.pan = function (deltaX, deltaY) {
        const offset = new THREE.Vector3();
        const position = this.object.position;
        offset.copy(position).sub(this.target);
        let targetDistance = offset.length();
        targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);
        this.panLeft(2 * deltaX * targetDistance / this.domElement.clientHeight);
        this.panUp(2 * deltaY * targetDistance / this.domElement.clientHeight);
    };

    this.panLeft = function (distance) {
        const panOffset = new THREE.Vector3();
        panOffset.setFromMatrixColumn(this.object.matrix, 0);
        panOffset.multiplyScalar(-distance);
        this.panOffset.add(panOffset);
    };

    this.panUp = function (distance) {
        const panOffset = new THREE.Vector3();
        panOffset.setFromMatrixColumn(this.object.matrix, 1);
        panOffset.multiplyScalar(distance);
        this.panOffset.add(panOffset);
    };

    this.dollyIn = function () {
        this.scale /= 0.95;
        this.update();
    };

    this.dollyOut = function () {
        this.scale *= 0.95;
        this.update();
    };

    this.update = function () {
        const offset = new THREE.Vector3();
        offset.copy(this.object.position).sub(this.target);
        let targetDistance = offset.length();
        targetDistance *= this.scale;
        this.object.position.copy(this.target).add(offset.normalize().multiplyScalar(targetDistance));
        this.object.lookAt(this.target);
        if (this.enableDamping === true) {
            this.panOffset.multiplyScalar(1 - this.dampingFactor);
            this.scale = 1 + (this.scale - 1) * (1 - this.dampingFactor);
        }
        this.target.add(this.panOffset);
        this.object.lookAt(this.target);
    };

    this.reset = function () {
        this.target.set(0, 0, 0);
        this.panOffset.set(0, 0, 0);
        this.scale = 1;
        this.update();
    };

    // Event listeners
    this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('wheel', this.onMouseWheel, false);
    this.domElement.addEventListener('touchstart', this.touchStart, false);
    this.domElement.addEventListener('touchend', this.onMouseUp, false);
    this.domElement.addEventListener('touchmove', this.touchMove, false);

    // Make sure the controls are updated
    this.update();
};