const bleServiceGuid = '19b10000-e8f2-537e-4f6c-d104768a1214';
const temperatureSensorCharacteristicGuid = '19b10001-e8f2-537e-4f6c-d104768a1214';
const heatingToggleCharacteristicGuid = '19b10002-e8f2-537e-4f6c-d104768a1214';
const heatingPowerOutputCharacteristicGuid = '19b10004-e8f2-537e-4f6c-d104768a1214'
const powerDropCharacteristicGuid = '19b10003-e8f2-537e-4f6c-d104768a1214';

const connectedDeviceTemplate = document.getElementById('connectedDeviceTemplate');
const devicesContainerElement = document.getElementById("connectedDevicesContainer")

const addNewDeviceButton = document.getElementById("addNewDeviceButton");
addNewDeviceButton.addEventListener("click", tryAddNewDevice);

let connectedDevicesList = [];

function tryAddNewDevice() {
    if (!isWebBluetoothEnabled()) {
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
                {namePrefix: "Thermo"}
                // {services: [bleServiceGuid]}
            ],
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
        .then(async connectedDevice => {
            connectedDevice.service = await connectedDevice.gattServer.getPrimaryService(bleServiceGuid);
            console.log("Service discovered:", connectedDevice.service);
            return connectedDevice;
        })
        .then(connectedDevice => {
            return Promise.all
            ([
                new Promise(() => connectDeviceInfoPanel(connectedDevice)),
                connectTemperatureSensorCharacteristic(connectedDevice),
                connectHeatingToggleCharacteristic(connectedDevice),
                connectHeatingPowerOutputCharacteristic(connectedDevice),
                connectPowerDropCharacteristic(connectedDevice)
            ]);
        })
        .catch(error => {
            console.log('Error: ', error);
        });
}


async function addConnectedDevice(device) {
    const newItem = document.importNode(connectedDeviceTemplate.content, true);
    let result = {
        device: device,
        domRoots: Array.from(newItem.childNodes),
        deviceNameField: newItem.querySelector('#deviceNameField'),
        deviceIdField: newItem.querySelector('#deviceIdField'),
        deviceConnectionStatusField: newItem.querySelector('#connectionStatusField'),
        deviceRemoveButton: newItem.querySelector('#deviceRemoveButton'),
        currentTemperatureField: newItem.querySelector('#currentTemperatureField'),
        lastTemperatureUpdateTimeField: newItem.querySelector('#lastTemperatureUpdateTimeField'),
        currentPowerOutputField: newItem.querySelector('#currentPowerOutputField'),
        currentHeatingStateField: newItem.querySelector('#currentHeatingStateField'),
        heatingSwitchButtonOn: newItem.querySelector('#heatingSwitchButtonOn'),
        heatingSwitchButtonOff: newItem.querySelector('#heatingSwitchButtonOff'),
        currentPowerDropStartTemperatureField: newItem.querySelector('#currentPowerDropStartTemperatureField'),
        currentPowerDropEndTemperatureField: newItem.querySelector('#currentPowerDropEndTemperatureField'),
        setPowerDropStartTemperatureInputField: newItem.querySelector('#setPowerDropStartTemperatureInputField'),
        setPowerDropEndTemperatureInputField: newItem.querySelector('#setPowerDropEndTemperatureInputField'),
        setPowerDropTemperatureButton: newItem.querySelector('#setPowerDropTemperatureButton'),
    }
    devicesContainerElement.appendChild(newItem);
    connectedDevicesList.push(result);
    return result;
}

function connectDeviceInfoPanel(connectedDevice) {
    connectedDevice.deviceNameField.innerHTML = connectedDevice.device.name;
    connectedDevice.deviceIdField.innerHTML = connectedDevice.device.id;
    connectedDevice.deviceRemoveButton.addEventListener("click", () => disconnectDevice(connectedDevice));
}

async function connectTemperatureSensorCharacteristic(connectedDevice) {
    const characteristic = await connectedDevice.service.getCharacteristic(temperatureSensorCharacteristicGuid);
    console.log("Characteristic discovered:", characteristic.uuid);
    connectedDevice.temperatureSensorCharacteristic = characteristic;
    characteristic.addEventListener('characteristicvaluechanged', event => updateTemperatureSensorValue(connectedDevice, event.target.value));
    await characteristic.startNotifications();
}

function updateTemperatureSensorValue(connectedDevice, value) {
    const newValueReceived = new TextDecoder().decode(value);
    connectedDevice.currentTemperatureField.innerHTML = newValueReceived + "°C";
    connectedDevice.lastTemperatureUpdateTimeField.innerHTML = getCurrentDateTime();
}

async function connectHeatingToggleCharacteristic(connectedDevice) {
    const characteristic = await connectedDevice.service.getCharacteristic(heatingToggleCharacteristicGuid);
    console.log("Characteristic discovered:", characteristic.uuid);

    connectedDevice.heatingToggleCharacteristic = characteristic;
    connectedDevice.heatingSwitchButtonOn.addEventListener("click", () => setHeatingToggleState(connectedDevice, true));
    connectedDevice.heatingSwitchButtonOff.addEventListener("click", () => setHeatingToggleState(connectedDevice, false));

    characteristic.addEventListener('characteristicvaluechanged', event => handleHeatingToggleStateUpdate(connectedDevice, event.target.value));
    await characteristic.startNotifications();

    const currentValue = await characteristic.readValue();
    handleHeatingToggleStateUpdate(connectedDevice, currentValue);
}

function handleHeatingToggleStateUpdate(connectedDevice, value) {
    const data = new TextDecoder().decode(value);
    const isOn = data === "on";
    setButtonHidden(connectedDevice.heatingSwitchButtonOn, isOn);
    setButtonHidden(connectedDevice.heatingSwitchButtonOff, !isOn);
    connectedDevice.currentHeatingStateField.innerHTML = isOn ? "enabled" : "disabled";
}

function setButtonHidden(element, isHidden) {
    const isCurrentlyHidden = element.classList.contains('hidden-button');
    if (isHidden && isCurrentlyHidden) {
        return;
    }

    element.classList.toggle('hidden-button');
}

function setHeatingToggleState(connectedDevice, isOn) {
    const data = new TextEncoder().encode(isOn ? "on" : "off");
    return connectedDevice.heatingToggleCharacteristic.writeValue(data);
}

async function connectHeatingPowerOutputCharacteristic(connectedDevice) {
    const characteristic = await connectedDevice.service.getCharacteristic(heatingPowerOutputCharacteristicGuid);
    console.log("Characteristic discovered:", characteristic.uuid);
    connectedDevice.heatingPowerOutputCharacteristic = characteristic;

    characteristic.addEventListener('characteristicvaluechanged', event => updateHeatingPowerOutputValue(connectedDevice, event.target.value));
    await characteristic.startNotifications();

    const currentValue = await characteristic.readValue();
    updateHeatingPowerOutputValue(connectedDevice, currentValue);
}

function updateHeatingPowerOutputValue(connectedDevice, value) {
    const data = new TextDecoder().decode(value);
    const number = Math.round(Number(data) * 100 * 10) / 10;
    connectedDevice.currentPowerOutputField.innerHTML = number + "%";
}

async function connectPowerDropCharacteristic(connectedDevice) {
    const characteristic = await connectedDevice.service.getCharacteristic(powerDropCharacteristicGuid);
    console.log("Characteristic discovered:", characteristic.uuid);
    connectedDevice.powerDropCharacteristic = characteristic;

    connectedDevice.setPowerDropTemperatureButton.addEventListener("click", () => setPowerDropTemperatures(
        connectedDevice,
        connectedDevice.setPowerDropStartTemperatureInputField.value,
        connectedDevice.setPowerDropEndTemperatureInputField.value
    ));

    characteristic.addEventListener('characteristicvaluechanged', event => updatePowerDropTemperatures(connectedDevice, event.target.value));
    await characteristic.startNotifications();

    const currentValue = await characteristic.readValue();
    updatePowerDropTemperatures(connectedDevice, currentValue);
}

function updatePowerDropTemperatures(connectedDevice, value) {
    const decodedValue = new TextDecoder().decode(value);
    const values = decodedValue.split(";");
    connectedDevice.currentPowerDropStartTemperatureField.innerHTML = Number(values[0]) + "°C";
    connectedDevice.currentPowerDropEndTemperatureField.innerHTML = Number(values[1]) + "°C";
}

function setPowerDropTemperatures(connectedDevice, dropStart, dropEnd) {
    const dataString = dropStart + ";" + dropEnd;
    const data = new TextEncoder().encode(dataString);
    return connectedDevice.powerDropCharacteristic.writeValue(data)
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

async function disconnectDevice(connectedDevice) {
    console.log("Disconnecting: ", connectedDevice.device.id);
    if (connectedDevice.gattServer && connectedDevice.gattServer.connected) {
        await connectedDevice.temperatureSensorCharacteristic.stopNotifications();
        await connectedDevice.heatingToggleCharacteristic.stopNotifications();
        await connectedDevice.powerDropCharacteristic.stopNotifications();
        console.log("Notifications from device stopped: ", connectedDevice.device.id)
    }

    unregisterConnectedDevice(connectedDevice);
    deleteConnectedDeviceView(connectedDevice);
}

function unregisterConnectedDevice(connectedDevice) {
    const index = connectedDevicesList.indexOf(connectedDevice);
    connectedDevicesList.splice(index, 1);
}

function deleteConnectedDeviceView(connectedDevice) {
    connectedDevice.domRoots.forEach(root => {
            if (devicesContainerElement.contains(root)) {
                devicesContainerElement.removeChild(root);
            }
        }
    );
}