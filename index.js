(function (w, m) {
    var BRIDGE_NAME = "__$proton__";
    var ROOT_ELEMENT = w;
    const md5 = require('./md5.js').default;

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
            console.log("onMqttEvent:" + JSON.stringify(res))
            var requestId = res.requestId;
            var request = this.requestTable[requestId];
            if (!request) {
                console.error("Can not find requestId:" + requestId);
                return
            }
            request.callback(res);
            delete this.requestTable[requestId];
        },

        onMqttSubscribe: function (res) {
            console.log("onMqttSubscribe:" + JSON.stringify(res))
            var requestId = res.requestId;
            var request = this.requestTable[requestId];
            if (!request) {
                console.error("Can not find requestId:" + requestId);
                return
            }
            request.callback(res);
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
            };
            this.bridge.onMqttSubscribe = function (res) {
                _this.onMqttSubscribe(res)
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
                if (!_this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.sendCmd(cmdStr);
                    resolve(res);
                }, 0);
            });
        },

        setConsoleVisible: function () {
            const _this = this;
            return new Promise(function (resolve, reject) {
                if (!_this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.setConsoleVisible();
                    resolve(res);
                }, 0);
            });
        },

        setDebugModel: function () {
            const _this = this;
            return new Promise(function (resolve, reject) {
                if (!_this.bridge) {
                    reject('Bridge not connected!');
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.setDebugModel();
                    resolve(res);
                }, 0);
            });
        },
        signHeader: function (cmd, nextTraceId, date) {
            var items = [
                'type=' + cmd.type || 'request',
                'action=' + cmd.action,
                'actionVersion=' + cmd.actionVersion || 1,
                'priority=' + cmd.priority || 1,
                'traceId=' + nextTraceId,
                'stationId=' + cmd.stationId || '',
                'timestamp=' + date,
                'deviceMetadataVersion=' + cmd.deviceMetadataVersion || 1,
                'stateMetadataVersion=' + cmd.stateMetadataVersion || 1,
                'appVersion=' + cmd.appVersion || "1",
                'protocolVersion=' + cmd.protocolVersion || 1
            ]
            var sorted = items.sort();
            var signLine = '';
            var first = true;
            console.log(sorted)
            for (var item of sorted) {
                if (first) {
                    signLine += item;
                    first = false;
                } else {
                    signLine += ('&' + item);
                }
            }
            signLine = signLine + cmd.signKey || null
            return this.md5Hex(signLine);
        },
        _wrapAsCmd: function (props) {
            var nextTraceId = this.nextTraceId++
            var date = new Date().valueOf()
            var sign = this.signHeader(props, nextTraceId, date)
            var cmd = {
                traceId: nextTraceId,
                action: props.action,
                actionVersion: props.actionVersion || 1,
                priority: props.priority || 1,
                type: props.type || 'request',
                stationId: props.stationId || '',
                timestamp: date,
                deviceMetadataVersion: props.deviceMetadataVersion || 1,
                stateMetadataVersion: props.stateMetadataVersion || 1,
                appVersion: props.appVersion || "1",
                protocolVersion: props.protocolVersion || 1,
                headerSign: sign,
                payload: props.payload
            };
            return cmd
        },

        sendAction: function (props) {
            console.log(1)
            var cmd = this._wrapAsCmd(props)
            var cmdStr = JSON.stringify(cmd);
            const _this = this;
            return new Promise(function (resolve, reject) {
                _this.sendCmdAsString(cmdStr).then(function (res) {
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
            console.log(2)
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
            console.log(1)
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
            return this.startMqtt(props);
        },

        startMqtt: function (props) {
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
                    reject('url&port & username & password is required!');
                    return;
                }
                setTimeout(function () {
                        var requestId = _this.bridge.connectMqtt(JSON.stringify(param));
                        _this.requestTable[requestId] = {
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
                    , 500)
            })
        },

        mqttClose: function (chId) {
            var _this = this;
            return new Promise(function (resolve) {
                if (!chId) {
                    resolve("chId is required!")
                }
                setTimeout(function () {
                    var res = _this.bridge.mqttClose(chId);
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        mqttSendMessage: function (props) {
            var param = {
                chId: props.chId,
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
                const re = '^[0-2]$';
                if (!param.qos.toString().match(re)) {
                    resolve('qos must 0|1|2')
                    return;
                }
                setTimeout(function () {
                    var res = _this.bridge.mqttSendMessage(JSON.stringify(param));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0);
            });
        },

        mqttSubscribeTopic: function (props) {
            return this.subscribeTopic(props);
        },

        subscribeTopic: function (props) {
            var param = {
                chId: props.chId,
                topic: props.topic,
                qos: props.qos || 1,
                payloadMode: props.payloadMode || "string"
            }
            var _this = this;
            return new Promise(function (resolve, reject) {
                if (!param.topic || !param.qos || !param.chId) {
                    console.log("param:" + JSON.stringify(param))
                    reject("topic & qos & chId is required!")
                    return
                }
                const re = '^[0-2]$';
                if (!param.qos.toString().match(re)) {
                    resolve('qos must 0|1|2')
                    return;
                }
                setTimeout(function () {
                    var requestId = _this.bridge.mqttSubscribeTopic(JSON.stringify(param))
                    _this.requestTable[requestId] = {
                        callback: function (res) {
                            var hasError = res.hasError;
                            if (hasError) {
                                reject(res);
                            } else {
                                resolve(res);
                            }
                        }
                    }
                }, 500)
            })
        },

        mqttCancelSubscribeTopic: function (props) {
            var param = {
                chId: props.chId,
                topic: props.topic,
            }
            var _this = this;
            return new Promise(function (resolve) {
                if (!param.topic || !param.chId) {
                    resolve("topic & chId is required!")
                    return
                }
                setTimeout(function () {
                    var res = _this.bridge.mqttCancelSubscribeTopic(JSON.stringify(param));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0)
            })
        },

        updateMetadataManager: function (props) {
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.updateMetadataManager(JSON.stringify(props));
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0)
            })
        },

        queryMetadataManager: function () {
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(function () {
                    var res = _this.bridge.queryMetadataManager();
                    var resObj = JSON.parse(res);
                    resolve(resObj);
                }, 0)
            })
        },
        md5Hex: function (str) {
            return md5.hex_md5(str).toUpperCase();
        }
    };
    if (m) {
        m.exports = ProtonWebSdk;
    } else {
        w.ProtonWebSdk = ProtonWebSdk;
    }
})(window, (typeof module) === 'undefined' ? undefined : module);
