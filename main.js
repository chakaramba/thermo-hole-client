const bleServiceGuid = '19b10000-e8f2-537e-4f6c-d104768a1214';
const temperatureSensorCharacteristicGuid = '19b10001-e8f2-537e-4f6c-d104768a1214';
const heatingToggleCharacteristicGuid = '19b10002-e8f2-537e-4f6c-d104768a1214';
const powerDropCharacteristicGuid = '19b10003-e8f2-537e-4f6c-d104768a1214';

let bleService;


const devicesContainerElement = document.getElementById("connectedDevicesContainer")
const addNewDeviceButton = document.getElementById("addNewDeviceButton");

const connectedDeviceTemplate = document.getElementById('connected-device-template').content;

addNewDeviceButton.addEventListener("click", tryAddNewDevice);

function tryAddNewDevice() {
    if (!isWebBluetoothEnabled()){
        return null;
    }
    
    return connectToDevice();
}

function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log('Web Bluetooth API is not available in this browser!');
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser/device!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // filters: [{name: deviceName}],
        optionalServices: [bleServiceGuid]
    })
        .then(device => {
            console.log('Device Selected:', device.name);
            return addConnectedDevice(device);
        })
        .then(async connectedDevice => {
            // connectedDevice.device.addEventListener('gattservicedisconnected', () => onDisconnected(connectedDevice));
            connectedDevice.gattServer = await connectedDevice.device.gatt.connect();
            console.log("Connected to GATT Server");
            return connectedDevice;
        })
        .then(async connectedDevice =>{
            connectedDevice.service = await connectedDevice.gattServer.getPrimaryService(bleServiceGuid);
            console.log("Service discovered:", connectedDevice.service);
            return connectedDevice;
        })
        .then(connectedDevice =>{
            return Promise.all
            ([
                connectTemperatureSensorCharacteristic(connectedDevice)
            ]);
        })
        .then(characteristicInitResults => {
            return true;
        })
        .catch(error => {
            console.log('Error: ', error);
        })
}

function addConnectedDevice(device) {
    const clone = document.importNode(connectedDeviceTemplate, true);
    const child = devicesContainerElement.appendChild(clone);
    
    return {
        device: device,
        deviceNameField: child.querySelector('#deviceNameField'),
        deviceIdField: child.querySelector('#deviceIdField'),
        deviceConnectionStatusField: child.querySelector('#connectionStatusField'),
        deviceRemoveButton: child.querySelector('#deviceRemoveButton'),
        currentTemperatureField: child.querySelector('#currentTemperatureField'),
        lastTemperatureUpdateTimeField : child.querySelector('#lastTemperatureUpdateTimeField'),
        currentPowerOutputTimeField : child.querySelector('#currentPowerOutputTimeField'),
        currentHeatingStateField: child.querySelector('#currentHeatingStateField'),
        heatingSwitchButton: child.querySelector('#heatingSwitchButton'),
        currentPowerDropStartTemperatureField: child.querySelector('#currentPowerDropStartTemperatureField'),
        currentPowerDropEndTemperatureField: child.querySelector('#currentPowerDropEndTemperatureField'),
        setPowerDropStartTemperatureInputField: child.querySelector('#setPowerDropStartTemperatureInput'),
        setPowerDropEndTemperatureInputField: child.querySelector('#setPowerDropEndTemperatureInput'),
        setPowerDropTemperatureButton: child.querySelector('#setPowerDropTemperatureButton'),
    }
}

function connectTemperatureSensorCharacteristic(connectedDevice){
    return connectedDevice.service.getCharacteristic(temperatureSensorCharacteristicGuid)
        .then(async characteristic => {
            connectedDevice.temperatureSensorCharacteristic = characteristic;
            characteristic.addEventListener('characteristicvaluechanged', event => handleTemperatureSensorUpdate(connectedDevice, event));
            characteristic.startNotifications();
            updateTemperatureSensorValue(await characteristic.readValue());
            return true;
        })
        .catch(error => {
            return error;
        })
}

function handleTemperatureSensorUpdate(connectedDevice, event) {
    updateTemperatureSensorValue(connectedDevice, event.target.value);
}

function updateTemperatureSensorValue(connectedDevice, value){
    const newValueReceived = new TextDecoder().decode(value);
    connectedDevice.currentTemperatureField.innerHTML = newValueReceived + "°C";
    connectedDevice.lastTemperatureUpdateTimeField.innerHTML = getDateTime();
}


function getDateTime() {
    const currentDate = new Date();
    const day = ("00" + currentDate.getDate()).slice(-2); // Convert day to string and slice
    const month = ("00" + (currentDate.getMonth() + 1)).slice(-2);
    const year = currentDate.getFullYear();
    const hours = ("00" + currentDate.getHours()).slice(-2);
    const minutes = ("00" + currentDate.getMinutes()).slice(-2);
    const seconds = ("00" + currentDate.getSeconds()).slice(-2);

    return day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
}