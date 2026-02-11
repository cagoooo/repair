// 報修類別資料
export const REPAIR_CATEGORIES = {
  IT: {
    id: 'IT',
    name: '資訊組',
    icon: '🖥️',
    color: '#8b5cf6',
    items: [
      { id: 'touch_screen', name: '觸控螢幕', icon: '🖥️' },
      { id: 'computer', name: '電腦主機', icon: '💻' },
      { id: 'monitor', name: '電腦螢幕', icon: '🖥️' },
      { id: 'keyboard', name: '鍵盤', icon: '⌨️' },
      { id: 'mouse', name: '滑鼠', icon: '🖱️' },
      { id: 'network_cable', name: '網路線', icon: '🔌' },
      { id: 'wifi', name: 'WIFI 訊號', icon: '📶' },
      { id: 'projector', name: '投影機', icon: '📽️' },
      { id: 'printer', name: '印表機', icon: '🖨️' },
      { id: 'other_it', name: '其他資訊設備', icon: '🔧' }
    ]
  },
  GENERAL: {
    id: 'GENERAL',
    name: '事務組',
    icon: '🔧',
    color: '#f97316',
    items: [
      { id: 'light', name: '電燈', icon: '💡' },
      { id: 'fan', name: '電扇', icon: '🌀' },
      { id: 'air_conditioner', name: '冷氣', icon: '❄️' },
      { id: 'window', name: '窗戶', icon: '🪟' },
      { id: 'door_lock', name: '門鎖', icon: '🔐' },
      { id: 'power_outlet', name: '電線插頭', icon: '🔌' },
      { id: 'desk_chair', name: '桌椅', icon: '🪑' },
      { id: 'blackboard', name: '黑板/白板', icon: '📋' },
      { id: 'water', name: '水龍頭/水管', icon: '🚰' },
      { id: 'other_general', name: '其他一般設備', icon: '🔧' }
    ]
  }
};

// 報修狀態
export const REPAIR_STATUS = {
  pending: {
    id: 'pending',
    name: '待處理',
    color: '#f59e0b',
    icon: '⏳'
  },
  in_progress: {
    id: 'in_progress',
    name: '處理中',
    color: '#3b82f6',
    icon: '🔄'
  },
  completed: {
    id: 'completed',
    name: '已完成',
    color: '#10b981',
    icon: '✅'
  },
  cancelled: {
    id: 'cancelled',
    name: '已取消',
    color: '#6b7280',
    icon: '❌'
  }
};

// 優先順序
export const REPAIR_PRIORITY = {
  low: {
    id: 'low',
    name: '低',
    color: '#6b7280',
    icon: '🔹'
  },
  normal: {
    id: 'normal',
    name: '一般',
    color: '#3b82f6',
    icon: '🔷'
  },
  high: {
    id: 'high',
    name: '高',
    color: '#f59e0b',
    icon: '🔶'
  },
  urgent: {
    id: 'urgent',
    name: '緊急',
    color: '#ef4444',
    icon: '🔴'
  }
};

// 教室類型
export const ROOM_TYPES = {
  classroom: { id: 'classroom', name: '普通教室', icon: '📚' },
  office: { id: 'office', name: '辦公室', icon: '🏢' },
  special: { id: 'special', name: '專科教室', icon: '🔬' },
  utility: { id: 'utility', name: '公共設施', icon: '🚻' },
  other: { id: 'other', name: '其他', icon: '📍' }
};
