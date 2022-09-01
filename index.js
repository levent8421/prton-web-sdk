(function (w, m) {
    const BRIDGE_NAME = "__$proton__";
    const ROOT_ELEMENT = w;

    function ProtonWebSdk() {
        this.nextTraceId = 0;
        this.bridge = null;
        this.messageCallback = null;
        this.requestTable = {};
        this.actionCallback = {};
    }

    ProtonWebSdk.prototype = {
        onMessage: function (msg) {
            if (!msg) {
                return;
            }
            const {action} = msg;
            const callback = this.actionCallback[action];
            if (callback) {
                callback(msg);
            }
            if (this.messageCallback) {
                this.messageCallback(msg);
            }
        },

        onRequestComplete: function (res) {
            const requestId = res.requestId;
            const request = this.requestTable[requestId];
            if (!request) {
                console.error("Can not find requestId:" + requestId);
                return;
            }
            request.callback(res);
            delete this.requestTable[requestId];
        },

        _setup: function () {
            const _this = this;
            this.bridge.onMessage = msg => {
                _this.onMessage(msg);
            };
            this.bridge.onRequestComplete = res => {
                _this.onRequestComplete(res);
            };
        },

        connect: function () {
            const _this = this;
            return new Promise((resolve, reject) => {
                if (ROOT_ELEMENT.hasOwnProperty(BRIDGE_NAME)) {
                    _this.bridge = ROOT_ELEMENT[BRIDGE_NAME];
                    _this._setup()
                    resolve(_this.bridge);
                } else {
                    _this.bridge = null;
                    reject('No variable named:[' + BRIDGE_NAME + '] in global namespace[window]!');
                }
            });
        },

        sendCmdAsString: function (cmdStr) {
            return new Promise((resolve, reject) => {
                if (!this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                const res = this.bridge.sendCmd(cmdStr);
                resolve(res);
            });
        },

        setConsoleVisible: function (visible) {
            return new Promise((resolve, reject) => {
                if (!this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                const res = this.bridge.setConsoleVisible(visible);
                resolve(res);
            });
        },

        sendAction: function (props) {
            const cmd = {
                traceId: this.nextTraceId++,
                action: props.action,
                actionVersion: props.actionVersion,
                payload: props.payload,
                priority: props.priority || 3,
                type: props.type || 'request',
            };
            const cmdStr = JSON.stringify(cmd);
            return new Promise((resolve, reject) => {
                this.sendCmdAsString(cmdStr).then(res => {
                    const resObj = JSON.parse(res);
                    resolve(resObj);
                }).catch(reject);
            });
        },

        subscribeMessage: function (callback) {
            this.messageCallback = callback;
        },

        sendRequest: function (props) {
            if (!props.method) {
                props.method = 'GET';
            }
            const body = props.body;
            if ((typeof body) !== 'string') {
                props.body = JSON.stringify(props.body);
            }
            const params = JSON.stringify(props);
            const _this = this;
            return new Promise((resolve, reject) => {
                if (!props.url) {
                    reject('url is required!');
                    return;
                }
                const requestId = _this.bridge.request(params);
                _this.requestTable[requestId] = {
                    request: props,
                    callback: res => {
                        const status = res.status;
                        if (status !== 200) {
                            reject(res);
                        } else {
                            resolve(res);
                        }
                    }
                };
            })
        },

        request: function (props) {
            return this.sendRequest(props);
        },

        subscribeAction: function (action, callback) {
            this.actionCallback[action] = callback;
        },
    };
    if (m) {
        m.export = ProtonWebSdk;
    } else {
        w.ProtonWebSdk = ProtonWebSdk;
    }
})(window, (typeof module) === 'undefined' ? undefined : module);