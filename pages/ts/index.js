import {
  getDeviceDetails
} from '../../utils/api/device-api';
import {
  getFamilyList
} from '../../utils/api/family-api';
import BleService from '../../libs/ble-server';
import request from '../../utils/request';
import {
  dpIdMap
} from '../../utils/ts_utils/config';

const BleConnectStatus = {
  notConnected: 'notConnected',
  connecting: 'connecting',
  connected: 'connected',
  connectionFailed: 'connectionFailed'
};

// 注入方法
BleService.initFunction(request);

Page({
  /**
   * 页面的初始数据
   */
  data: {
    count_realtime: '0',
    countmode: '最近一次训练',
    speed_realtime: '0',
    time_realtime: '0',
    xsmode: '自由模式',
    BLS: '蓝牙未连接',

    device_name: '',
    bleInstance: null,
    bleConnectStatus: BleConnectStatus.notConnected,
    dpState: {},
    array: ['自由模式', '计数模式'],
    objectArray: [{
        id: 0,
        name: 'free_jump'
      },
      {
        id: 1,
        name: 'countdown_number'
      },
    ],
    index: 0,
    mode: '自由模式',
    bleConnect: false,
    cishu: 50
  },
  jumpTodeviceEditPage() {
    const {
      icon,
      device_id,
      device_name
    } = this.data;
    wx.navigateTo({
      url: `/pages/home_center/device_manage/index?device_id=${device_id}&device_name=${device_name}&device_icon=${icon}`
    });
  },



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    var count_realtime = '0';
    var countmode = '最近一次训练';
    var speed_realtime = '0';
    var time_realtime = '0';
    var xsmode = '自由模式';
    var BLS = '蓝牙未连接';

    const {
      device_id
    } = options
    const {
      name,
      icon
    } = await getDeviceDetails(device_id)
    // 家庭id
    const owner_id = wx.getStorageSync('owner_id')

    // 抽象的蓝牙设备实例
    const instance = BleService.setNewInstance(device_id, owner_id);
    // 功能点实例化
    instance.set('_bleIotData', {
      _ble_dpCodeMap: dpIdMap
    });
    // 监听蓝牙通信
    instance.revicePackage((parseReceiveData) => {
      const {
        type,
        status,
        dpState,
        deviceId,
      } = parseReceiveData;
      console.log("===parseReceiveData===" + type, status, dpState, deviceId);
      this.setData({
        dpState,
        status,
        type,
        deviceId
      });

      if (type === 'connect' && status === 'fail') {
        this.setData({
          BLS: '蓝牙连接失败',
        });
        if (deviceId) {
          return {
            msg: '连接失败 或 连接后又断开'
          }
        } else {
          return {
            msg: '未发现当前蓝牙设备'
          }
        }
      } else if (type === 'connect' && status === 'connected') {
        // 连接成功
        this.setData({
          BLS: '蓝牙连接成功',
        });
        wx.showToast({
          title: '蓝牙连接成功',
          icon: 'success',
          duration: 2000
        })
      } else if (type === 'connect' && status === 'connecting') {
        // 连接成功
        wx.showToast({
          title: '请稍后退出重新连接',
          icon: 'error',
          duration: 2000
        })
      } else if (!(deviceId in parseReceiveData)) {
        // 一般为dp上报事件，可在此处处理数据or走业务逻辑
        var getmode = dpState.mode;
        switch (getmode) {
          case 'countdown_time':
            xsmode = "倒计时模式暂未开发";
            count_realtime = '0',
              countmode = '请选择自由或计数模式',
              speed_realtime = '0',
              time_realtime = '0';
            break;
          case 'countdown_number':
            xsmode = "计数模式";
            count_realtime = dpState.count_realtime;
            time_realtime = dpState.time_realtime;
            speed_realtime = dpState.speed_realtime;
            countmode = '剩余个数';
            break;
          case 'free_jump':
            xsmode = "自由模式";
            count_realtime = dpState.count_realtime;
            time_realtime = dpState.time_realtime;
            speed_realtime = dpState.speed_realtime;
            countmode = '最近一次训练';
            break;
          default: {
            break;
          }
        }
        this.setData({
          xsmode,
          count_realtime,
          time_realtime,
          speed_realtime,
          countmode,
        });
      }
    });

    // 指令下发
    this.setData({
      device_name: name,
      icon,
      bleInstance: instance
    });
  },

  sendCount: function () {
    let that = this
    let cishu = that.data.cishu
    const {
      bleInstance
    } = this.data;
    if (bleInstance) {
      bleInstance.sendDp({
        dpCode: 'target_count',
        dpValue: cishu
      });
    }
  },


  // 下发指令，设置本次跳绳模式为 倒计数 模式
  sendMod: function () {
    const {
      bleInstance
    } = this.data;
    if (bleInstance) {
      bleInstance.sendDp({
        dpCode: 'mode',
        dpValue: 'countdown_number'
      });
    }
  },




  //模式选择picker
  bindPickerChange: function (e) {
    const {
      bleInstance
    } = this.data;

    if (e.detail.value === '0') {
      bleInstance.sendDp({
        dpCode: 'mode',
        dpValue: 'free_jump'
      });

    } else if (e.detail.value === '1') {
      bleInstance.sendDp({
        dpCode: 'mode',
        dpValue: 'countdown_number'
      });

    }

  },

  getcishu: function (e) {
    var val = e.detail.value;
    this.setData({
      cishu: val
    })
    console.log('次数为', this.data.cishu)
  },

  // 蓝牙连接
  connect: function () {
    this.data.bleInstance.connectBlue()

    wx.showToast({
      title: '正在连接',
      icon: 'loading',
      duration: 200000
    })
  }




});