//###################图形化定义######################
//% color="#C814B8" weight=25 icon="\uf1d4"
namespace moco_底盘模式 {
    //运动模式选择
    export enum mode {
        //% block="前进"
        前进,
        //% block="后退"
        后退,
        //% block="左转"
        左转,
        //% block="右转"
        右转,
        //% block="左移"
        左移,
        //% block="右移"
        右移
    }
    //角度选择 
    export enum mode1 {
        //% block="左摆"
        左摆,
        //% block="右摆"
        右摆,
        //% block="俯视"
        俯视,
        //% block="仰视"
        仰视,
        //% block="航线角"
        航向角
    }
    //速度选择
    export enum speed {
        //% block="1"
        快,
        //% block="中"
        中,
        //% block="慢"
        慢,
        //% block="停"
        停
    }
    //步态选择
    export enum gait {
        //% block="慢跑"
        慢跑,
        //% block="快跑"
        快跑
    }



}

//###################函数定义######################
//###SPI
//------------全局定义-----------
let usb_send_cnt = 0
let SfoCnt = 0
let SSLen = 40
let ToSlaveBuf = pins.createBuffer(SSLen)
let InfoTemp = pins.createBuffer(SSLen)
let DaHeader = 0x2B
let DaTail = 0xEE

let data_tx = pins.createBuffer(38);
let gait_mode = 0;
let rc_spd_cmd_X = 0.00 //x速度
let rc_spd_cmd_y = 0.00 //y速度
let rc_att_rate_cmd = 0.00 // 速度
let rc_spd_cmd_z = 0.00 //
let rc_pos_cmd = 0.00 //高度
let rc_att_cmd_x = 0.00 //俯仰
let rc_att_cmd_y = 0.00 //侧摆
let rc_att_cmd = 0.00 //航向角
// let usb_send_cnt = 0
let state = 0

//------------SPI初始化-----------
function SPI_SPCP_Init() {
    pins.digitalWritePin(DigitalPin.P16, 1)
    pins.digitalWritePin(DigitalPin.P6, 1)
    pins.spiPins(DigitalPin.P15, DigitalPin.P14, DigitalPin.P13)
    pins.spiFrequency(1000000)
    //pins.spiFormat(8, pins.spiWrite(0))
    led.enable(false)
}

//------------SPI的底盘协议发送-----------
function Chassis_SPI_Send() {
    pins.digitalWritePin(DigitalPin.P16, 0)
    pins.digitalWritePin(DigitalPin.P6, 0)
    for (let i = 0; i < 200; i++);
    for (let i = 0; i < usb_send_cnt; i++) {
        InfoTemp[i] = pins.spiWrite(data_tx[i])
    }
    //serial.writeBuffer(ToSlaveBuf)
    pins.digitalWritePin(DigitalPin.P6, 1)
    pins.digitalWritePin(DigitalPin.P16, 1)
}

//------------SPI的底盘发送数据-----------
//发送数据初始化
function Data_int() {
    for (let i = 0; i < 38; i++) {
        data_tx[i] = 0x00
    }
}

//数据发送
function Data_send() {
    let i = 0;
    let cnt_reg = 0;
    let sum = 0x00;
    usb_send_cnt = cnt_reg
    data_tx[usb_send_cnt++] = 0xCA
    data_tx[usb_send_cnt++] = 0xCF
    data_tx[usb_send_cnt++] = 0x93
    data_tx[usb_send_cnt++] = 0x21

    data_tx[usb_send_cnt++] = gait_mode
    get_float_hex(rc_spd_cmd_X)
    get_float_hex(rc_spd_cmd_y)
    get_float_hex(rc_att_rate_cmd)
    get_float_hex(rc_spd_cmd_z)
    get_float_hex(rc_pos_cmd)
    get_float_hex(rc_att_cmd_x)
    get_float_hex(rc_att_cmd_y)
    get_float_hex(rc_att_cmd)
    for (i = 0; i < usb_send_cnt; i++) {
        sum += data_tx[i]
    }
    data_tx[usb_send_cnt] = sum
    if (state == 1) {
        //SPI发送
        Chassis_SPI_Send()
    }
    // basic.pause(100)
}

//------------数据转换-----------
function DecToBinTail(dec: number, pad: number) {
    let bin = "";
    let i;
    for (i = 0; i < pad; i++) {
        dec *= 2;
        if (dec >= 1) {
            dec -= 1;
            bin += "1";
        }
        else {
            bin += "0";
        }
    }
    return bin;
}

function DecToBinHead(dec: number, pad: number) {
    let bin = "";
    let i;
    for (i = 0; i < pad; i++) {
        bin = parseInt((dec % 2).toString()) + bin;
        dec /= 2;
    }
    return bin;
}

function get_float_hex(decString: number) {
    let dec = decString;
    let sign;
    let signString;
    let decValue = parseFloat(Math.abs(decString).toString());
    let fraction = 0;
    let exponent = 0;
    let ssss = []

    if (decString.toString().charAt(0) == '-') {
        sign = 1;
        signString = "1";
    }
    else {
        sign = 0;
        signString = "0";
    }
    if (decValue == 0) {
        fraction = 0;
        exponent = 0;
    }
    else {
        exponent = 127;
        if (decValue >= 2) {
            while (decValue >= 2) {
                exponent++;
                decValue /= 2;
            }
        }
        else if (decValue < 1) {
            while (decValue < 1) {
                exponent--;
                decValue *= 2;
                if (exponent == 0)
                    break;
            }
        }
        if (exponent != 0) decValue -= 1; else decValue /= 2;

    }
    let fractionString = DecToBinTail(decValue, 23);
    let exponentString = DecToBinHead(exponent, 8);
    let ss11 = parseInt(signString + exponentString + fractionString, 2)
    data_tx[usb_send_cnt++] = ((ss11 << 24) >> 24)
    data_tx[usb_send_cnt++] = ((ss11 << 16) >> 24)
    data_tx[usb_send_cnt++] = ((ss11 << 8) >> 24)
    data_tx[usb_send_cnt++] = ((ss11 >> 24))
}