(function (w, m) {
    var BRIDGE_NAME = "__$proton__";
    var ROOT_ELEMENT = w;

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
            var {action} = msg;
            var callback = this.actionCallback[action];
            if (callback) {
                callback(msg);
            }
            if (this.messageCallback) {
                this.messageCallback(msg);
            }
        },

        onRequestComplete: function (res) {
            var requestId = res.requestId;
            var request = this.requestTable[requestId];
            if (!request) {
                console.error("Can not find requestId:" + requestId);
                return;
            }
            request.callback(res);
            delete this.requestTable[requestId];
        },

        onMqttEvent: function (res) {
            var requestId = res.requestId;
            var request = this.requestTable[requestId];
            if (!request) {
                console.error("Can not find requestId:" + requestId);
                return
            }
            request.callback(res);
            delete this.requestTable[requestId];
        },

        _setup: function () {
            var _this = this;
            this.bridge.onMessage = function (msg) {
                _this.onMessage(msg);
            };
            this.bridge.onRequestComplete = function (res) {
                _this.onRequestComplete(res);
            };
            this.bridge.onMqttEvent = function (res) {
                _this.onMqttEvent(res)
            }
        },

        connect: function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
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
            const _this = this;
            return new Promise((resolve, reject) => {
                if (!this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.sendCmd(cmdStr);
                    resolve(res);
                }, 0);
            });
        },

        setConsoleVisible: function (visible) {
            const _this = this;
            return new Promise(function (resolve, reject) {
                if (!this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.setConsoleVisible(visible);
                    resolve(res);
                }, 0);
            });
        },

        sendAction: function (props) {
            var cmd = {
                traceId: this.nextTraceId++,
                action: props.action,
                actionVersion: props.actionVersion,
                payload: props.payload,
                priority: props.priority || 3,
                type: props.type || 'request',
            };
            var cmdStr = JSON.stringify(cmd);
            return new Promise(function (resolve, reject) {
                this.sendCmdAsString(cmdStr).then(function (res) {
                    var resObj = JSON.parse(res);
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
            var body = props.body;
            if ((typeof body) !== 'string') {
                props.body = JSON.stringify(props.body);
            }
            var params = JSON.stringify(props);
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (!props.url) {
                    reject('url is required!');
                    return;
                }
                setTimeout(function () {
                    var requestId = _this.bridge.request(params);
                    _this.requestTable[requestId] = {
                        request: props,
                        callback: function (res) {
                            var status = res.status;
                            if (status !== 200) {
                                reject(res);
                            } else {
                                resolve(res);
                            }
                        }
                    };
                }, 0);
            });
        },

        request: function (props) {
            return this.sendRequest(props);
        },

        subscribeAction: function (action, callback) {
            this.actionCallback[action] = callback;
        },

        readFile: function (props) {
            var params = {
                path: props.path,
                charset: props.charset || 'utf8',
                mode: props.mode || 'string'
            };
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.readFile(JSON.stringify(params));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        writeFile: function (props) {
            var params = {
                path: props.path,
                mode: props.mode || 'string',
                content: props.content,
                charset: props.charset || 'utf8',
                append: props.append || false,
                autoCreate: props.autoCreate || true
            };
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.writeFile(JSON.stringify(params));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        fileStat: function (filePath) {
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.fileStat(filePath);
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        deleteFile: function (props) {
            var params = {
                path: props.path,
            };
            if (props.hasOwnProperty('recursion')) {
                params.recursion = props.recursion;
            } else {
                params.recursion = true;
            }
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.deleteFile(JSON.stringify(params));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        listFile: function (filePath) {
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.listFile(filePath);
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        mkdir: function (props) {
            var params = {
                path: props.path,
            };
            if (props.hasOwnProperty('createParent')) {
                params.createParent = props.createParent;
            } else {
                params.createParent = true;
            }
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.mkdir(JSON.stringify(params));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        connectMqtt: function (props) {
            var param = {
                host: props.host,
                port: props.port,
                autoReconnect: props.autoReconnect || true,
                username: props.username,
                password: props.password
            };
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (!props.host || !props.port || !props.username || !props.password) {
                    reject('url|port|username|password is required!');
                    return;
                }
                setTimeout(function () {
                        var requestId = _this.bridge.connectMqtt(JSON.stringify(param));
                        _this.requestTable[requestId] = {
                            request: param,
                            callback: function (res) {
                                var hasError = res.hasError;
                                if (hasError) {
                                    reject(res);
                                } else {
                                    resolve(res);
                                }
                            }
                        }
                    }
                    , 0)
            })
        },

        mqttClose: function (props) {
            var param = {
                chId: props.chId
            }
            var _this = this;
            return new Promise(function (resolve) {
                if (!param.chId) {
                    resolve("chId is required!")
                }
                setTimeout(function () {
                    var res = _this.bridge.mqttClose(JSON.stringify(param));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        mqttSendMessage: function (props) {
            var param = {
                payload: props.payload,
                payloadMode: props.payloadMode || "string",
                topic: props.topic,
                qos: props.qos,
                retained: props.retained || true
            }
            var _this = this;
            return new Promise(function (resolve) {
                if (!param.chId) {
                    resolve("chId is required!")
                    return
                }
                setTimeout(function () {
                    var res = _this.bridge.mqttSendMessage(JSON.stringify(param));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        mqttSubscribeTopic: function (props) {
            var param = {
                topic: props.topic,
                qos: props.qos,
                payloadMode: props.payloadMode || "string"
            }
            var _this = this;
            return new Promise(function (resolve,reject){
                if (!param.topic || !param.qos){
                    reject("topic|qos is required!")
                    return
                }
                setTimeout(function (){
                    var requestId = _this.bridge.mqttSubscribeTopic(JSON.stringify(param))
                    _this.requestTable[requestId] = {
                        request: param,
                        callback: function (res) {
                            var hasError = res.hasError;
                            if (hasError) {
                                reject(res);
                            } else {
                                resolve(res);
                            }
                        }
                    }
                },0)
            })
        },

        mqttCancelSubscribeTopic: function (topic) {
            var _this = this;
            return new Promise(function (resolve){
                if (topic){
                    resolve("props")
                    return
                }
                setTimeout(function (){
                    var res = _this.bridge.mqttCancelSubscribeTopic(topic);
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                },0)
            })
        }
    };
    if (m) {
        m.exports = ProtonWebSdk;
    } else {
        w.ProtonWebSdk = ProtonWebSdk;
    }
})(window, (typeof module) === 'undefined' ? undefined : module);