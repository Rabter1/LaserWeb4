import React from 'react'
import { connect } from 'react-redux';

import { PanelGroup, Panel, Tooltip, OverlayTrigger, FormControl, InputGroup, ControlLabel, FormGroup, ButtonGroup, Label, Collapse, Badge, ButtonToolbar, Button, Glyphicon } from 'react-bootstrap';

import { Input, TextField, NumberField, ToggleField, SelectField, Info } from './forms';
import { runStatus } from './jog.js';
import { setSettingsAttrs } from '../actions/settings';
import { setComAttrs } from '../actions/com';
import { setWorkspaceAttrs } from '../actions/workspace';
// import { setGcode } from '../actions/gcode';
import CommandHistory from './command-history';

import { alert, prompt, confirm} from './laserweb';

import Icon from './font-awesome';

import io from 'socket.io-client';
var socket, connectVia, connectReset;
var serverConnected = false;
var machineConnected = false;
var jobLines = 0;
var jobStartTime = -1;
var accumulatedJobTime = 0;
var playing = false;
var paused = false;
var m0 = false;
var laserTestOn = false;
var firmware, fVersion, fDate;
var xpos, ypos, zpos, apos;
var xOffset, yOffset, zOffset, aOffset;

export { xOffset, yOffset }


const formatPorts=(data)=>{
    return data.map((item)=>{
       return { value: item.path, label:item.manufacturer? `${item.manufacturer} @ ${item.path}`: item.path };
    })
}

function compareVersion(v1, v2) {
    if (typeof v1 !== 'string') return false;
    if (typeof v2 !== 'string') return false;
    v1 = v1.split('.');
    v2 = v2.split('.');
    const k = Math.min(v1.length, v2.length);
    for (let i = 0; i < k; ++ i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
    }
    return v1.length == v2.length ? 0: (v1.length < v2.length ? -1 : 1);
}

class Com extends React.Component {

    constructor(props) {
        super(props);
        let {comInterfaces, comPorts, comAccumulatedJobTime} = this.props.settings;
        accumulatedJobTime = comAccumulatedJobTime;
        this.state = {comInterfaces: comInterfaces, comPorts: comPorts};
    }

    componentDidMount() {
        if (!serverConnected) {
            $('#connectS').removeClass('disabled');
            $('#disconnectS').addClass('disabled');
            if (!socket && !serverConnected) {
                this.handleConnectServer();
            }
        } else {
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (!machineConnected) {
                $('#connect').removeClass('disabled');
                $('#disconnect').addClass('disabled');
            } else {
                $('#connect').addClass('disabled');
                $('#disconnect').removeClass('disabled');
            }
        }
    }

    handleConnectServer() {
        let that = this;
        let {settings, dispatch} = this.props;
        let server = settings.comServerIP;
        CommandHistory.write('Connecting to Server @ ' + server, CommandHistory.INFO);
        //console.log('Connecting to Server ' + server);
        socket = io('ws://' + server);

        socket.on('connect', function(data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            //socket.emit('firstLoad');
            socket.emit('getServerConfig');
            CommandHistory.write('Server connected', CommandHistory.SUCCESS);
        });

        socket.on('disconnect', function() {
            CommandHistory.error('Disconnected from Server ' + settings.comServerIP)
            //console.log('Disconnected from Server ' + settings.commServerIP);
            serverConnected = false;
            $('#connectS').removeClass('disabled');
            $('#disconnectS').addClass('disabled');
            machineConnected = false;
            $('#connect').removeClass('disabled');
            $('#disconnect').addClass('disabled');
            firmware = '';
            fVersion = '';
            fDate = '';
        });

//        socket.on('open', function(data) {
//            serverConnected = true;
//            $('#connectS').addClass('disabled');
//            $('#disconnectS').removeClass('disabled');
//            // Web Socket is connected
//            //console.log('open ' + data);
//            socket.emit('getInterfaces');
//            socket.emit('getPorts');
//            CommandHistory.write('Socket opened: ' + data + '(' + socket.id + ')', CommandHistory.INFO);
//        });

        socket.on('serverConfig', function (data) {
            serverConnected = true;
            let serverVersion = data.serverVersion;
            let apiVersion = data.apiVersion;
            dispatch(setSettingsAttrs({comServerVersion: serverVersion}));
            dispatch(setSettingsAttrs({comApiVersion: apiVersion}));
            //CommandHistory.write('Server version: ' + serverVersion, CommandHistory.INFO);
            console.log('serverVersion: ' + serverVersion + ', API: ' + apiVersion);
        });

        socket.on('interfaces', function(data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                let interfaces = new Array();
                for (var i = 0; i < data.length; i++) {
                    interfaces.push(data[i]);
                }
                that.setState({comInterfaces: interfaces});
                dispatch(setSettingsAttrs({comInterfaces: interfaces}));
                console.log('interfaces: ' + interfaces);
                CommandHistory.write('Interfaces: ' + interfaces);
            } else {
                console.log('server sent empty interfaces list');
                CommandHistory.write('No supported interfaces found on server')
            }
        });

        socket.on('ports', function (data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                let ports = new Array();
                for (var i = 0; i < data.length; i++) {
                      ports.push(data[i].path);
                }
                that.setState({comPorts: data});
                dispatch(setSettingsAttrs({comPorts: data}));
                console.log('ports: ' + JSON.stringify(data));
                CommandHistory.write('Serial ports detected: ' + ports);
            } else {
                console.log('server sent empty serial ports list');
                CommandHistory.write('No serial ports found on server');
            }
        });

        socket.on('activeInterface', function (data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                //set the actual interface
            }
            console.log('activeInterface: ' + data);
        });

        socket.on('activePort', function (data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                //set the actual port
            }
            console.log('activePorts: ' + JSON.stringify(data));
        });

        socket.on('activeBaudRate', function (data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                //set the actual baudrate
            }
            console.log('activeBaudrate: ' + data);
        });

        socket.on('activeIP', function (data) {
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.length > 0) {
                //set the actual machine IP
            }
            console.log('activeIP: ' + data);
        });

        socket.on('connectStatus', function (data) {
            console.log('connectStatus: ' + data);
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            if (data.indexOf('opened') >= 0) {
                machineConnected = true;
                $('#connect').addClass('disabled');
                $('#disconnect').removeClass('disabled');
                CommandHistory.write('Machine connected', CommandHistory.SUCCESS);
            }
            if (data.indexOf('Connect') >= 0) {
                machineConnected = false;
                $('#connect').removeClass('disabled');
                $('#disconnect').addClass('disabled');
                firmware = '';
                fVersion = '';
                fDate = '';
                CommandHistory.error('Machine disconnected')
            }
        });

        socket.on('firmware', function (data) {
            console.log('firmware: ' + JSON.stringify(data));
            serverConnected = true;
            $('#connectS').addClass('disabled');
            $('#disconnectS').removeClass('disabled');
            machineConnected = true;
            $('#connect').addClass('disabled');
            $('#disconnect').removeClass('disabled');
            firmware = data.firmware;
            fVersion = data.version;
            fDate = data.date;
            dispatch(setComAttrs({ firmware: firmware, firmwareVersion: fVersion && fVersion.toString() }));
            CommandHistory.write('Firmware ' + firmware + ' ' + fVersion + ' detected', CommandHistory.SUCCESS);
            if (firmware === 'grbl' && parseFloat(fVersion) < 1.1) {
                CommandHistory.error('Grbl version too old -> YOU MUST INSTALL AT LEAST GRBL 1.1e')
                socket.emit('closePort', 1);
                machineConnected = false;
                //console.log('GRBL < 1.1 not supported!');
            }
        });

        socket.on('runningJob', function (data) {
            // returned boy older lw-comm-server, should no longer be used.
            CommandHistory.write('Running Job!', CommandHistory.WARN);
            jobLines = data.split(/\r\n|\r|\n/).length
            if (data.length < 512) {
                CommandHistory.write(data, CommandHistory.STD);
                alert('<strong>Server Busy:</strong><br/>' + data);
            } else {
                CommandHistory.write('Connected to busy server, Running job size: ' + data.length + ' bytes.', CommandHistory.STD);
                alert('<strong>Server Busy:</strong><br/>Running job is ' + data.length + ' bytes long.');
            }
        });

        socket.on('runningJobStatus', function (data) {
            // Recieved in response to a reconnect while the server is busy
            CommandHistory.write('Reconnect; server reports: ' + data, CommandHistory.STD);
            alert('<strong>Server Busy:</strong><br/>' + data);
            // Look for the running job size in the response
            let detail = data.split('done of ',2);
            jobLines = parseInt(detail[1]) || 0;
        });

        socket.on('runningJobStatus', function (data) {
            CommandHistory.write('Server reports: ' + data, CommandHistory.STD);
            alert(data);
        });

        socket.on('runStatus', function (status) {
            //CommandHistory.write('runStatus: ' + status);
            console.log('runStatus: ' + status);
            if (status === 'running') {
                playing = true;
                paused = false;
            } else if (status === 'paused') {
                paused = true;
            } else if (status === 'm0') {
                paused = true;
                m0 = true;
            } else if (status === 'resumed') {
                paused = false;
            } else if (status === 'stopped') {
                playing = false;
                paused = false;
            } else if (status === 'finished') {
                playing = false;
                paused = false;
            } else if (status === 'alarm') {
                CommandHistory.error('ALARM!')
                //socket.emit('clearAlarm', 2);
            }
            runStatus(status);
        });

        socket.on('data', function (data) {
            serverConnected = true;
            machineConnected = true;
            if (data) {
                if (data.indexOf('<') === 0) {
                    //CommandHistory.write('statusReport: ' + data);
                    updateStatus(data);
                } else {
                    var style = CommandHistory.STD;
                    if (data.indexOf('[MSG:') === 0) {
                        style = CommandHistory.WARN;
                    } else if (data.indexOf('ALARM:') === 0) {
                        style = CommandHistory.DANGER;
                    } else if (data.indexOf('error:') === 0) {
                        style = CommandHistory.DANGER;
                    }
                    CommandHistory.write(data, style);
                }
            }
        });

        socket.on('wPos', function (wpos) {
            serverConnected = true;
            machineConnected = true;
            let {x, y, z, a} = wpos; //var pos = wpos.split(',');
            let posChanged = false;
            if (xpos !== x) {
                xpos = x;
                posChanged = true;
            }
            if (ypos !== y) {
                ypos = y;
                posChanged = true;
            }
            if (zpos !== z) {
                zpos = z;
                posChanged = true;
            }
            if (apos !== a) {
                apos = a;
                posChanged = true;
            }
            if (posChanged) {
                //CommandHistory.write('WPos: ' + xpos + ' / ' + ypos + ' / ' + zpos);
                //console.log('WPos: ' + xpos + ' / ' + ypos + ' / ' + zpos);
                $('#mX').html(xpos);
                $('#mY').html(ypos);
                $('#mZ').html(zpos);
                $('#mA').html(apos);
                dispatch(setWorkspaceAttrs({ cursorPos: [xpos, ypos, zpos] }));
            }
        });

        socket.on('wOffset', function (wOffset) {
            serverConnected = true;
            machineConnected = true;
            let {x, y, z, a} = wOffset;
                x=Number(x)
                y=Number(y)
                z=Number(z)
                a=Number(a)

            let posChanged = false;
            if ((xOffset !== x) && !isNaN(x)) {
                xOffset = x;
                posChanged = true;
            }
            if ((yOffset !== y) && !isNaN(y)) {
                yOffset = y;
                posChanged = true;
            }
            if ((zOffset !== z) && !isNaN(z)) {
                zOffset = z;
                posChanged = true;
            }
            if ((aOffset !== a) && !isNaN(a)) {
                aOffset = a;
                posChanged = true;
            }
            if (posChanged) {
                CommandHistory.write('Workspace Offset: X= ' + xOffset + ', Y= ' + yOffset + ', Z= ' + zOffset + ', A= ' + aOffset, CommandHistory.INFO);
                dispatch(setWorkspaceAttrs({ workOffsetX: +xOffset, workOffsetY: +yOffset }));
            }
        });

        // feed override report (from server)
        socket.on('feedOverride', function (data) {
            serverConnected = true;
            //CommandHistory.write('feedOverride: ' + data, CommandHistory.STD);
            //console.log('feedOverride ' + data);
            $('#oF').html(data.toString() + '<span class="drounitlabel"> %</span>');
        });

        // spindle override report (from server)
        socket.on('spindleOverride', function (data) {
            serverConnected = true;
            //CommandHistory.write('spindleOverride: ' + data, CommandHistory.STD);
            //console.log('spindleOverride ' + data);
            $('#oS').html(data.toString() + '<span class="drounitlabel"> %</span>');
        });

        // real feed report (from server)
        socket.on('realFeed', function (data) {
            serverConnected = true;
            //CommandHistory.write('realFeed: ' + data, CommandHistory.STD);
            //console.log('realFeed ' + data);
            //$('#mF').html(data);
        });

        // real spindle report (from server)
        socket.on('realSpindle', function (data) {
            serverConnected = true;
            //CommandHistory.write('realSpindle: ' + data, CommandHistory.STD);
            //console.log('realSpindle ' + data);
            //$('#mS').html(data);
        });

        // laserTest state
        socket.on('laserTest', function (data) {
            serverConnected = true;
            //CommandHistory.write('laserTest: ' + data, CommandHistory.STD);
            //console.log('laserTest ' + data);
            if (data > 0){
                laserTestOn = true;
                $("#lT").addClass('btn-highlight');
            } else if (data === 0) {
                laserTestOn = false;
                $('#lT').removeClass('btn-highlight');
            }
        });

        socket.on('qCount', function (data) {
            serverConnected = true;
            $('#connect').addClass('disabled');
            $('#disconnect').removeClass('disabled');
            //console.log('qCount ' + data);
            data = parseInt(data);
            let queueState = 'Queue Empty'
            if (data > 0) {
                queueState = '';
                if (jobLines > 0) {
                    let done = ((jobLines-data)/jobLines)*99.9;
                    queueState += done.toFixed(1) + '% sent, '
                }
                queueState += 'queue: ' + data;
            }
            $('#queueCnt').html(queueState);
            if (playing && data === 0) {
                playing = false;
                paused = false;
                jobLines = 0;
                runStatus('stopped');
                $('#playicon').removeClass('fa-pause');
                $('#playicon').addClass('fa-play');

                if (jobStartTime >= 0) {
                    var jobFinishTime = new Date(Date.now());
                    var elapsedTimeMS = jobFinishTime.getTime() - jobStartTime.getTime();
                    var elapsedTime = Math.round(elapsedTimeMS / 1000);
                    CommandHistory.write("Job started at " + jobStartTime.toString(), CommandHistory.SUCCESS);
                    CommandHistory.write("Job finished at " + jobFinishTime.toString(), CommandHistory.SUCCESS);
                    CommandHistory.write("Elapsed time: " + secToHMS(elapsedTime), CommandHistory.SUCCESS);
                    jobStartTime = -1;
                    accumulatedJobTime += elapsedTime;
                    let AJT = accumulatedJobTime;
                    dispatch(setSettingsAttrs({comAccumulatedJobTime: AJT}));
                    CommandHistory.write("Total accumulated job time: " + secToHMS(AJT), CommandHistory.SUCCESS);
                }
            }
        });

        socket.on('close', function() {
            serverConnected = false;
            $('#connectS').removeClass('disabled');
            $('#disconnectS').addClass('disabled');
            machineConnected = false;
            $('#connect').removeClass('disabled');
            $('#disconnect').addClass('disabled');
            CommandHistory.error('Server connection closed')
            // websocket is closed.
            //console.log('Server connection closed');
            let serverVersion = 'not connected';
            dispatch(setSettingsAttrs({comServerVersion: serverVersion}));
            dispatch(setSettingsAttrs({comApiVersion: serverVersion}));
            $("#machineStatus").removeClass('badge-ok');
            $("#machineStatus").addClass('badge-notify');
            $("#machineStatus").removeClass('badge-warn');
            $("#machineStatus").removeClass('badge-busy');
            $('#machineStatus').html("Not Connected");
            $('#connect').addClass('disabled');
            $('#disconnect').addClass('disabled');
        });

        socket.on('error', function (data) {
            CommandHistory.error('Server error: ' + data)
            //console.log('error: ' + data);
        });

    }

    handleDisconnectServer() {
        let { dispatch } = this.props;
        if (socket) {
            CommandHistory.write('Disconnecting from server', CommandHistory.INFO);
            console.log('Server Disconnected by user');
            socket.disconnect();
            let serverVersion = 'not connected';
            dispatch(setSettingsAttrs({comServerVersion: serverVersion}));
            dispatch(setSettingsAttrs({comApiVersion: serverVersion}));
            $("#machineStatus").removeClass('badge-ok');
            $("#machineStatus").addClass('badge-notify');
            $("#machineStatus").removeClass('badge-warn');
            $("#machineStatus").removeClass('badge-busy');
            $('#machineStatus').html("Not Connected");
            $('#connect').addClass('disabled');
            $('#disconnect').addClass('disabled');
        }
    }

    handleConnectMachine() {
        var connectVia = this.props.settings.connectVia;
        var connectPort = this.props.settings.connectPort.trim();
        var connectBaud = this.props.settings.connectBaud;
        var connectReset = this.props.settings.connectReset;
        var connectIP = this.props.settings.connectIP;
        var comServerVersion = this.props.settings.comServerVersion;
        var comApiVersion = this.props.settings.comApiVersion;

        if (compareVersion(comApiVersion, "4.0.7") != 1) CommandHistory.write('Connected server version (' + comServerVersion + ') does not support firmware detection options.',CommandHistory.DANGER);

        switch (connectVia) {
            case 'USB':
                if (!connectPort) {
                    CommandHistory.write('Could not connect! -> please select port', CommandHistory.DANGER);
                    break;
                }
                if (!connectBaud) {
                    CommandHistory.write('Could not connect! -> please select baudrate', CommandHistory.DANGER);
                    break;
                }
                CommandHistory.write('Connecting Machine via USB/Serial, Port: ' + connectPort + ' @ ' + connectBaud + ' baud; reset on connect: ' + connectReset, CommandHistory.INFO);
                socket.emit('connectTo', connectVia + ',' + connectPort + ',' + connectBaud + ',' + connectReset);
                break;
            case 'Telnet':
                if (!connectIP) {
                    CommandHistory.write('Could not connect! -> please enter IP address', CommandHistory.DANGER);
                    break;
                }
                CommandHistory.write('Connecting Machine via Telnet, IP: ' + connectIP + '; reset on connect: ' + connectReset, CommandHistory.INFO);
                socket.emit('connectTo', connectVia + ',' + connectIP + ',null,' + connectReset);
                break;
            case 'ESP8266':
                if (!connectIP) {
                    CommandHistory.write('Could not connect! -> please enter IP address', CommandHistory.DANGER);
                    break;
                }
                CommandHistory.write('Connecting Machine via ESP Socket, IP: ' + connectIP + '; reset on connect: ' + connectReset, CommandHistory.INFO);
                socket.emit('connectTo', connectVia + ',' + connectIP + ',null,' + connectReset);
                break;
            case 'Default':
                CommandHistory.write('Connecting Machine via default method: ' + '<WORK IN PROGRESS>', CommandHistory.INFO);
                socket.emit('connectTo', connectVia);
                break;
        }
    }

    handleDisconnectMachine() {
        confirm("This will halt the current running job! Are you sure?", (data) => { if (data) {
            CommandHistory.write('Disconnecting Machine', CommandHistory.INFO);
            console.log('Machine Disconnected by user');
            socket.emit('closePort');
            playing = false;
            paused = false;
            jobLines = 0;
            runStatus('stopped');
            $("#machineStatus").removeClass('badge-ok');
            $("#machineStatus").addClass('badge-notify');
            $("#machineStatus").removeClass('badge-warn');
            $("#machineStatus").removeClass('badge-busy');
            $('#machineStatus').html("Not Connected");
            }}, ($('#machineStatus').html() != "Run")
    )}

    render() {
        let {settings, dispatch} = this.props;

        return (
            <div style={{paddingTop: 6}}>
                <span className="badge badge-default badge-notify" title="Machine status" id="machineStatus" style={{ marginRight: 5 }}>Not Connected</span>

                <PanelGroup>
                    <Panel collapsible header="Server Connection" bsStyle="primary" eventKey="1" defaultExpanded={(!serverConnected)}>
                        <TextField {...{ object: settings, field: 'comServerIP', setAttrs: setSettingsAttrs, description: 'Server IP' }} />
                        <ButtonGroup>
                            <Button id="connectS" bsClass="btn btn-xs btn-info" onClick={(e)=>{this.handleConnectServer(e)}}><Icon name="share" /> Connect</Button>
                            <Button id="disconnectS" bsClass="btn btn-xs btn-danger disabled" onClick={(e)=>{this.handleDisconnectServer(e)}}><Glyphicon glyph="trash" /> Disconnect</Button>
                        </ButtonGroup>
                    </Panel>

                    <Panel collapsible header="Machine Connection" bsStyle="primary" eventKey="2" defaultExpanded={(!machineConnected)}>
                        <SelectField {...{ object: settings, field: 'connectVia', setAttrs: setSettingsAttrs, data: this.state.comInterfaces, defaultValue: '', description: 'Machine Connection', selectProps: { clearable: false } }} />
                        <Collapse in={settings.connectVia == 'USB'}>
                            <div>
                                <SelectField {...{ object: settings, field: 'connectPort', setAttrs: setSettingsAttrs, data: formatPorts(this.state.comPorts), defaultValue: '', description: 'USB / Serial Port', selectProps: { clearable: false } }} />
                                <SelectField {...{ object: settings, field: 'connectBaud', setAttrs: setSettingsAttrs, data: ['250000', '230400', '115200', '57600', '38400', '19200', '9600'], defaultValue: '115200', description: 'Baudrate', selectProps: { clearable: false } }} />
                            </div>
                        </Collapse>
                        <Collapse in={settings.connectVia != 'USB' && settings.connectVia != 'Default'}>
                            <div>
                                <TextField {...{ object: settings, field: 'connectIP', setAttrs: setSettingsAttrs, description: 'Machine IP' }} />
                            </div>
                        </Collapse>
                        <SelectField {...{ object: settings, field: 'connectReset', setAttrs: setSettingsAttrs, data: ['true', 'false', 'default'], defaultValue: 'default', description: '^X on Connect', selectProps: { clearable: false } }} />
                        <ButtonGroup>
                            <Button id="connect" bsClass="btn btn-xs btn-info disabled"   onClick={(e)=>{this.handleConnectMachine(e)}}><Icon name="share" /> Connect</Button>
                            <Button id="disconnect" bsClass="btn btn-xs btn-danger disabled" onClick={(e)=>{this.handleDisconnectMachine(e)}}><Glyphicon glyph="trash" /> Disconnect</Button>
                        </ButtonGroup>
                    </Panel>

                </PanelGroup>
            </div>
        )

    }
}

function secToHMS(sec) {
    let hours = Math.floor(sec / 3600);
    let minutes = Math.floor(sec / 60) % 60;
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    let seconds = sec % 60;
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
}

function updateStatus(data) {
    // Smoothieware: <Idle,MPos:49.5756,279.7644,-15.0000,WPos:0.0000,0.0000,0.0000>
    // till GRBL v0.9: <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000>
    // since GRBL v1.1: <Idle|WPos:0.000,0.000,0.000|Bf:15,128|FS:0,0|Pn:S|WCO:0.000,0.000,0.000> (when $10=2)

    // Extract state
    var state = data.substring(data.indexOf('<') + 1, data.search(/(,|\|)/));
    if (state === 'Alarm') {
        $("#machineStatus").removeClass('badge-ok');
        $("#machineStatus").addClass('badge-notify');
        $("#machineStatus").removeClass('badge-warn');
        $("#machineStatus").removeClass('badge-busy');
        $('#stopBtn .icon-top-text').html('clear');
        $('#stopBtn .icon-bot-text').html('alarm');
        $('#stopIcon').removeClass('fa-stop');
        $('#stopIcon').addClass('fa-unlock');
//        if ($('#alarmmodal').is(':visible')) {
//            // Nothing, its already open
//        } else {
//            //$('#alarmmodal').modal('show');
//        }
    } else if (state === 'Home') {
        $("#machineStatus").removeClass('badge-ok');
        $("#machineStatus").removeClass('badge-notify');
        $("#machineStatus").removeClass('badge-warn');
        $("#machineStatus").addClass('badge-busy');
        $('#stopBtn .icon-top-text').html('abort');
        $('#stopBtn .icon-bot-text').html('job');
        $('#stopIcon').removeClass('fa-unlock');
        $('#stopIcon').addClass('fa-stop');
//        if ($('#alarmmodal').is(':visible')) {
//            $('#alarmmodal').modal('hide');
//        }
    } else if (state === 'Hold') {
        $("#machineStatus").removeClass('badge-ok');
        $("#machineStatus").removeClass('badge-notify');
        $("#machineStatus").addClass('badge-warn');
        $("#machineStatus").removeClass('badge-busy');
        $('#stopBtn .icon-top-text').html('abort');
        $('#stopBtn .icon-bot-text').html('job');
        $('#stopIcon').removeClass('fa-unlock');
        $('#stopIcon').addClass('fa-stop');
        //$('#playBtn .icon-top-text').html('resume');
//        if ($('#alarmmodal').is(':visible')) {
//            $('#alarmmodal').modal('hide');
//        }
    } else if (state === 'Idle') {
        $("#machineStatus").addClass('badge-ok');
        $("#machineStatus").removeClass('badge-notify');
        $("#machineStatus").removeClass('badge-warn');
        $("#machineStatus").removeClass('badge-busy');
        $('#stopBtn .icon-top-text').html('abort');
        $('#stopBtn .icon-bot-text').html('job');
        $('#stopIcon').removeClass('fa-unlock');
        $('#stopIcon').addClass('fa-stop');
        //$('#playBtn .icon-top-text').html('run');
//        if ($('#alarmmodal').is(':visible')) {
//            $('#alarmmodal').modal('hide');
//        }
    } else if (state === 'Run') {
        $("#machineStatus").removeClass('badge-ok');
        $("#machineStatus").removeClass('badge-notify');
        $("#machineStatus").removeClass('badge-warn');
        $("#machineStatus").addClass('badge-busy');
        $('#stopBtn .icon-top-text').html('abort');
        $('#stopBtn .icon-bot-text').html('job');
        $('#stopIcon').removeClass('fa-unlock');
        $('#stopIcon').addClass('fa-stop');
        //$('#playBtn .icon-top-text').html('pause');
//        if ($('#alarmmodal').is(':visible')) {
//            $('#alarmmodal').modal('hide');
//        }
    }
    $('#machineStatus').html(state);
}


export function runCommand(gcode) {
    if (serverConnected) {
        if (machineConnected){
            if (gcode) {
                //CommandHistory.write('Running Command', CommandHistory.INFO);
                //console.log('runCommand', gcode);
                socket.emit('runCommand', gcode);
                return true;
            }
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
    return false;
}

export function runJob(job) {
    if (serverConnected) {
        if (machineConnected){
            if (playing === false) {
                if (job.length > 0) {
                    jobLines = job.split(/\r\n|\r|\n/).length
                    CommandHistory.write('Running Job; ' + jobLines + ' lines', CommandHistory.INFO);
                    playing = true;
                    jobLines = job.split(/\r\n|\r|\n/).length
                    runStatus('running');
                    $('#playicon').removeClass('fa-play');
                    $('#playicon').addClass('fa-pause');
                    jobStartTime = new Date(Date.now());
                    socket.emit('runJob', job);
                } else {
                    CommandHistory.error('Job empty!')
                }
            } else {
                CommandHistory.error('Machine is already busy!')
            }
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function pauseJob() {
    console.log('pauseJob');
    if (serverConnected) {
        if (machineConnected){
            paused = true;
            runStatus('paused');
            $('#playicon').removeClass('fa-pause');
            $('#playicon').addClass('fa-play');
            socket.emit('pause');
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function resumeJob() {
    console.log('resumeJob');
    if (serverConnected) {
        if (machineConnected){
            paused = false;
            m0 = false;
            runStatus('running');
            $('#playicon').removeClass('fa-play');
            $('#playicon').addClass('fa-pause');
            socket.emit('resume');
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function abortJob() {
    console.log('abortJob');
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Aborting job', CommandHistory.INFO);
            playing = false;
            paused = false;
            m0 = false;
            jobLines = 0;
            runStatus('stopped');
            $('#playicon').removeClass('fa-pause');
            $('#playicon').addClass('fa-play');
            socket.emit('stop');
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function clearAlarm(method) {
    console.log('clearAlarm');
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Resetting alarm', CommandHistory.INFO);
            socket.emit('clearAlarm', method);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function setZero(axis) {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Set ' + axis + ' Axis zero', CommandHistory.INFO);
            socket.emit('setZero', axis);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function gotoZero(axis) {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Goto ' + axis + ' zero', CommandHistory.INFO);
            socket.emit('gotoZero', axis);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function setPosition(data) {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Set position to ' + JSON.stringify(data), CommandHistory.INFO);
            socket.emit('setPosition', data);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function home(axis) {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Home ' + axis, CommandHistory.INFO);
            socket.emit('home', axis);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function probe(axis, offset) {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.write('Probe ' + axis + ' (Offset:' + offset + ')', CommandHistory.INFO);
            socket.emit('probe', {axis: axis, offset: offset});
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function laserTest(power, duration, maxS) {
    if (serverConnected) {
        if (machineConnected){
            console.log('laserTest(' + power + ', ' + duration + ', ' + maxS + ')');
            socket.emit('laserTest', power + ',' + duration + ',' + maxS);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function jog(axis, dist, feed) {
    if (serverConnected) {
        if (machineConnected){
            //console.log('jog(' + axis + ',' + dist + ',' + feed + ')');
            socket.emit('jog', axis + ',' + dist + ',' + feed);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function jogTo(x, y, z, mode, feed) {
    if (serverConnected) {
        if (machineConnected){
            //console.log('jog(' + axis + ',' + dist + ',' + feed + ')');
            socket.emit('jogTo', {x: x, y: y, z: z, mode: mode, feed: feed});
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function feedOverride(step) {
    if (serverConnected) {
        if (machineConnected){
            console.log('feedOverride ' + step);
            socket.emit('feedOverride', step);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function spindleOverride(step) {
    if (serverConnected) {
        if (machineConnected){
            console.log('spindleOverride ' + step);
            socket.emit('spindleOverride', step);
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function resetMachine() {
    if (serverConnected) {
        if (machineConnected){
            CommandHistory.error('Resetting Machine')
            socket.emit('resetMachine');
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

export function playpauseMachine() {
    if (serverConnected) {
        if (machineConnected){
            if (playing === true) {
                if (paused === true) {
                    // unpause
                    var laseroncmd = document.getElementById('laseron').value;
                    if (laseroncmd.length === 0) {
                        laseroncmd = 0;
                    }
                    socket.emit('resume', laseroncmd);
                    paused = false;
                    runStatus('running');
                    $('#playicon').removeClass('fa-play');
                    $('#playicon').addClass('fa-pause');
                    // end ifPaused
                } else {
                    // pause
                    var laseroffcmd = document.getElementById('laseroff').value;
                    if (laseroffcmd.length === 0) {
                        laseroffcmd = 0;
                    }
                    socket.emit('pause', laseroffcmd);
                    paused = true;
                    runStatus('paused');
                    $('#playicon').removeClass('fa-pause');
                    $('#playicon').addClass('fa-play');
                }
                // end isPlaying
            } else {
                playGcode();
            }
            // end isConnected
        } else {
            CommandHistory.error('Machine is not connected!')
        }
    } else {
        CommandHistory.error('Server is not connected!')
    }
}

Com = connect(
    state => ({ com: state.com, settings: state.settings, comInterfaces: state.comInterfaces, comPorts: state.comPorts, documents: state.documents, gcode: state.gcode.content })
)(Com);

export default Com
