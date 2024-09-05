const bleServiceGuid = '19b10000-e8f2-537e-4f6c-d104768a1214';
const temperatureSensorCharacteristicGuid = '19b10001-e8f2-537e-4f6c-d104768a1214';
const heatingToggleCharacteristicGuid = '19b10002-e8f2-537e-4f6c-d104768a1214';
const powerDropCharacteristicGuid = '19b10003-e8f2-537e-4f6c-d104768a1214';

const connectedDeviceTemplate = document.getElementById('connectedDeviceTemplate');

const devicesContainerElement = document.getElementById("connectedDevicesContainer")

const addNewDeviceButton = document.getElementById("addNewDeviceButton");
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

async function connectToDevice() {
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        acceptAllDevices: false,
        filters:
            [
                {namePrefix : "Thermo"}
                // {services: [bleServiceGuid]}
            ],
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
        .then(async connectedDevice => {
            connectedDevice.service = await connectedDevice.gattServer.getPrimaryService(bleServiceGuid);
            console.log("Service discovered:", connectedDevice.service);
            return connectedDevice;
        })
        .then(connectedDevice => {
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


async function addConnectedDevice(device) {
    const newItem = document.importNode(connectedDeviceTemplate.content, true);
    let result = {
        device: device,
        deviceNameField: newItem.querySelector('#deviceNameField'),
        deviceIdField: newItem.querySelector('#deviceIdField'),
        deviceConnectionStatusField: newItem.querySelector('#connectionStatusField'),
        deviceRemoveButton: newItem.querySelector('#deviceRemoveButton'),
        currentTemperatureField: newItem.querySelector('#currentTemperatureField'),
        lastTemperatureUpdateTimeField: newItem.querySelector('#lastTemperatureUpdateTimeField'),
        currentPowerOutputTimeField: newItem.querySelector('#currentPowerOutputTimeField'),
        currentHeatingStateField: newItem.querySelector('#currentHeatingStateField'),
        heatingSwitchButton: newItem.querySelector('#heatingSwitchButton'),
        currentPowerDropStartTemperatureField: newItem.querySelector('#currentPowerDropStartTemperatureField'),
        currentPowerDropEndTemperatureField: newItem.querySelector('#currentPowerDropEndTemperatureField'),
        setPowerDropStartTemperatureInputField: newItem.querySelector('#setPowerDropStartTemperatureInput'),
        setPowerDropEndTemperatureInputField: newItem.querySelector('#setPowerDropEndTemperatureInput'),
        setPowerDropTemperatureButton: newItem.querySelector('#setPowerDropTemperatureButton'),
    }
    devicesContainerElement.appendChild(newItem);
    return result;
}

function connectTemperatureSensorCharacteristic(connectedDevice) {
    return connectedDevice.service.getCharacteristic(temperatureSensorCharacteristicGuid)
        .then(async characteristic => {
            connectedDevice.temperatureSensorCharacteristic = characteristic;
            characteristic.addEventListener('characteristicvaluechanged', event => handleTemperatureSensorUpdate(connectedDevice, event));
            await characteristic.startNotifications();
            return true;
        })
        .catch(error => {
            return error;
        })
}

function handleTemperatureSensorUpdate(connectedDevice, event) {
    updateTemperatureSensorValue(connectedDevice, event.target.value);
}

function updateTemperatureSensorValue(connectedDevice, value) {
    const newValueReceived = new TextDecoder().decode(value);
    connectedDevice.currentTemperatureField.innerHTML = newValueReceived + "°C";
    connectedDevice.lastTemperatureUpdateTimeField.innerHTML = getCurrentDateTime();
}


function getCurrentDateTime() {
    const currentDate = new Date();
    const day = ("00" + currentDate.getDate()).slice(-2); // Convert day to string and slice
    const month = ("00" + (currentDate.getMonth() + 1)).slice(-2);
    const year = currentDate.getFullYear();
    const hours = ("00" + currentDate.getHours()).slice(-2);
    const minutes = ("00" + currentDate.getMinutes()).slice(-2);
    const seconds = ("00" + currentDate.getSeconds()).slice(-2);

    return day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
}