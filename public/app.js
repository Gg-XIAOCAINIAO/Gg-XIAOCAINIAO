import { ProductViewer, parseModelUrl } from "./viewer3d.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const DEFAULT_NOTE_PLACEHOLDER = "给器物留个便签吧——可以备注一下用来干啥（办公或自用），最好拍张产品照片上传哦～";

const els = {
  headerDate: $("#header-date"),
  tabs: $$(".view-tab"),
  views: {
    products: $("#view-products"),
    borrowers: $("#view-borrowers"),
    history: $("#view-history"),
  },
  categoryList: $("#category-list"),
  categoryEmptyToggle: $("#category-empty-toggle"),
  productStrip: $("#product-strip"),
  stripPrev: $("#strip-prev"),
  stripNext: $("#strip-next"),
  collectionCount: $("#collection-count"),
  galleryOpen: $("#gallery-open"),
  productIndex: $("#product-index"),
  productStatus: $("#product-status"),
  productCategory: $("#product-category"),
  productName: $("#product-name"),
  productSubline: $("#product-subline"),
  watermark: $("#viewer-watermark"),
  primaryAction: $("#primary-action"),
  borrowSameAction: $("#borrow-same-action"),
  secondaryAction: $("#secondary-action"),
  modelOpen: $("#model-open"),
  modelDrawer: $("#model-drawer"),
  modelClose: $("#model-close"),
  modelContext: $("#model-context"),
  modelStyleGrid: $("#model-style-grid"),
  modelShapeName: $("#model-shape-name"),
  prototypeSearch: $("#prototype-search"),
  prototypeList: $("#prototype-list"),
  prototypeCount: $("#prototype-count"),
  modelScaleX: $("#model-scale-x"),
  modelScaleY: $("#model-scale-y"),
  modelScaleZ: $("#model-scale-z"),
  modelScaleXValue: $("#model-scale-x-value"),
  modelScaleYValue: $("#model-scale-y-value"),
  modelScaleZValue: $("#model-scale-z-value"),
  modelScaleReset: $("#model-scale-reset"),
  modelFinishOptions: $("#model-finish-options"),
  modelFinishNote: $("#model-finish-note"),
  modelScopeOptions: $("#model-scope-options"),
  modelCancel: $("#model-cancel"),
  modelApply: $("#model-apply"),
  modelGenerateOpen: $("#model-generate-open"),
  modelGeneratedHint: $("#model-generated-hint"),
  modelCustomGrid: $("#model-custom-grid"),
  modelLibraryOpen: $("#model-library-open"),
  modelLibraryDialog: $("#model-library-dialog"),
  modelImportForm: $("#model-import-form"),
  modelImportFile: $("#model-import-file"),
  modelImportName: $("#model-import-name"),
  modelImportFilename: $("#model-import-filename"),
  modelImportError: $("#model-import-error"),
  modelImportSubmit: $("#model-import-submit"),
  modelLibraryTabs: $("#model-library-tabs"),
  modelLibraryList: $("#model-library-list"),
  generateDialog: $("#generate-dialog"),
  generateForm: $("#generate-form"),
  generateName: $("#generate-name"),
  generateError: $("#generate-error"),
  canvas: $("#scene"),
  viewerFallback: $("#viewer-fallback"),
  borrowerGrid: $("#borrower-grid"),
  borrowerEmpty: $("#borrower-empty"),
  borrowerSummary: $("#borrower-summary"),
  borrowerRefresh: $("#borrower-refresh"),
  borrowerAdd: $("#borrower-add"),
  borrowerDialog: $("#borrower-dialog"),
  borrowerForm: $("#borrower-form"),
  borrowerName: $("#borrower-name"),
  borrowerNameError: $("#borrower-name-error"),
  borrowerNote: $("#borrower-note"),
  borrowerSubmit: $("#borrower-submit"),
  historyAdd: $("#history-add"),
  historyDialog: $("#history-dialog"),
  historyForm: $("#history-form"),
  historyProduct: $("#history-product"),
  historyProductName: $("#history-product-name"),
  historyCategory: $("#history-category"),
  historyBorrower: $("#history-borrower"),
  historyLend: $("#history-lend"),
  historyReturn: $("#history-return"),
  historyProductError: $("#history-product-error"),
  historyBorrowerError: $("#history-borrower-error"),
  historyDateError: $("#history-date-error"),
  historySubmit: $("#history-submit"),
  archiveCount: $("#archive-count"),
  filterBorrower: $("#filter-borrower"),
  filterCategory: $("#filter-category"),
  filterFrom: $("#filter-from"),
  filterTo: $("#filter-to"),
  filterSearch: $("#filter-search"),
  searchClear: $("#search-clear"),
  filterReset: $("#filter-reset"),
  historyShell: $("#history-shell"),
  historyBody: $("#history-body"),
  historyTotal: $("#history-total"),
  historyPagination: $("#history-pagination"),
  rentDialog: $("#rent-dialog"),
  rentForm: $("#rent-form"),
  rentProductName: $("#rent-product-name"),
  rentOptions: $("#rent-options"),
  rentSelectionCount: $("#rent-selection-count"),
  rentItemsError: $("#rent-items-error"),
  rentBorrower: $("#rent-borrower"),
  rentDate: $("#rent-date"),
  rentBorrowerError: $("#rent-borrower-error"),
  rentDateError: $("#rent-date-error"),
  rentSubmit: $("#rent-submit"),
  returnDialog: $("#return-dialog"),
  returnForm: $("#return-form"),
  returnProductName: $("#return-product-name"),
  returnBorrower: $("#return-borrower"),
  returnSelectedCount: $("#return-selected-count"),
  returnOptions: $("#return-options"),
  returnItemsError: $("#return-items-error"),
  returnDate: $("#return-date"),
  returnDateError: $("#return-date-error"),
  returnSubmit: $("#return-submit"),
  borrowerSuggestions: $("#borrower-suggestions"),
  adminOpenHeader: $("#admin-open-header"),
  adminOpenAdd: $("#admin-open-add"),
  productAddOpen: $("#product-add-open"),
  userChip: $("#user-chip"),
  userName: $("#user-name"),
  logoutBtn: $("#logout-btn"),
  adminDrawer: $("#admin-drawer"),
  adminBackdrop: $("#admin-backdrop"),
  adminClose: $("#admin-close"),
  adminEyebrow: $("#admin-eyebrow"),
  adminTitle: $("#admin-title"),
  adminCategoryCount: $("#admin-category-count"),
  adminTreeToggle: $("#admin-tree-toggle"),
  adminTreeToggleLabel: $("#admin-tree-toggle-label"),
  adminProductSection: $("#admin-product-section"),
  guideOpen: $("#guide-open"),
  guideDialog: $("#guide-dialog"),
  guideOpenAdd: $("#guide-open-add"),
  categoryForm: $("#category-form"),
  categoryName: $("#category-name"),
  categoryParent: $("#category-parent"),
  categoryTree: $("#category-tree"),
  productForm: $("#product-form"),
  adminProductName: $("#admin-product-name"),
  adminProductCategory: $("#admin-product-category"),
  adminProductQuantity: $("#admin-product-quantity"),
  adminProductModel: $("#admin-product-model"),
  adminProductSection: $("#admin-product-section"),
  adminNoteText: $("#admin-product-note"),
  adminNoteCount: $("#admin-note-count"),
  adminNoteFile: $("#admin-product-note-image"),
  adminNotePreview: $("#admin-note-preview"),
  adminNotePreviewImg: $("#admin-note-preview-img"),
  adminNoteFilename: $("#admin-note-filename"),
  adminNoteRemove: $("#admin-note-remove"),
  adminNoteError: $("#admin-note-error"),
  notePlaceholderEdit: $("#admin-note-placeholder-edit"),
  notePlaceholderSection: $("#admin-note-placeholder-section"),
  notePlaceholderForm: $("#note-placeholder-form"),
  notePlaceholderInput: $("#note-placeholder-input"),
  notePlaceholderError: $("#note-placeholder-error"),
  notePlaceholderReset: $("#note-placeholder-reset"),
  notePlaceholderSave: $("#note-placeholder-save"),
  confirmDialog: $("#confirm-dialog"),
  confirmTitle: $("#confirm-title"),
  confirmMessage: $("#confirm-message"),
  noteDialog: $("#note-dialog"),
  noteProductName: $("#note-product-name"),
  noteCategory: $("#note-category"),
  noteBody: $("#note-body"),
  noteText: $("#note-text"),
  noteImageWrap: $("#note-image-wrap"),
  noteImageLink: $("#note-image-link"),
  noteImage: $("#note-image"),
  noteEmpty: $("#note-empty"),
  galleryDialog: $("#gallery-dialog"),
  galleryGrid: $("#gallery-grid"),
  gallerySearch: $("#gallery-search"),
  gallerySummary: $("#gallery-summary"),
  galleryEmpty: $("#gallery-empty"),
  galleryFullscreen: $("#gallery-fullscreen"),
  galleryFullscreenLabel: $("#gallery-fullscreen span"),
  toast: $("#toast"),
};

const MODEL_NOTES = {
  "lounge-chair": "低重心 · 白蜡木与亚麻",
  "dining-chair": "榫卯结构 · 榉木",
  stool: "手工车木 · 羊毛坐面",
  "table-lamp": "暖光 2700K · 亚麻灯罩",
  "floor-lamp": "可调光 · 黄铜与亚麻",
  speaker: "胡桃木箱体 · 蓝牙 5.3",
  turntable: "皮带驱动 · 胡桃木底座",
  camera: "35mm 定焦 · 复古机身",
  projector: "轻量便携 · 1080P",
  "coffee-table": "白蜡木 · 低矮款",
  "side-table": "砂岩涂层 · 三足",
  loveseat: "宽体双人 · 亚麻软包",
  "office-chair": "人体工学 · 网布与铝合金",
  monitor: "27 英寸 · 2K 显示屏",
  laptop: "铝合金 · 轻薄本",
  cabinet: "双门收纳 · 白蜡木",
  bed: "实木框架 · 亚麻床品",
  plant: "陶盆 · 常绿植物",
  appliance: "不锈钢 · 桌面电器",
  vessel: "手工陶器 · 花器",
  generated: "按品类名生成的展示模型",
  "ear-clip": "C 形夹臂 · 开放式",
  "ear-hook": "耳挂结构 · 运动佩戴",
  "bone-conduction": "后挂一体 · 骨传导",
  keyboard: "机械轴体 · 参数化配列",
  mouse: "轻量化 · 电竞外形",
  mousepad: "圆角缝边 · 平面板材",
  "monitor-arm": "气弹簧臂 · VESA 接口",
  tv: "超薄屏体 · 窄边框",
  "power-bank": "磁吸环 · 数显窗口",
  charger: "氮化镓 · 折叠插脚",
  "phone-cooler": "磁吸散热 · 涡轮风扇",
  controller: "双握把 · 摇杆与扳机",
  ssd: "阳极氧化铝 · 移动固态",
  phone: "直板机身 · 多摄模组",
  tablet: "大屏直板 · 铝合金",
  "robot-vacuum": "圆盘机身 · 激光雷达",
  vacuum: "立式清洁 · 清水箱",
  fridge: "多门立柜 · 金属面板",
  "air-conditioner": "壁挂内机 · 导风板",
  toothbrush: "声波手柄 · 可换刷头",
  shaver: "旋转刀头 · 手握柄体",
  "blood-pressure": "臂式主机 · 织物袖带",
  "hearing-aid": "耳背式 · 透明导声管",
  massager: "C 形颈环 · 按摩节点",
  "massage-chair": "包覆式 · 小腿按摩段",
  treadmill: "跑带平台 · 折叠立柱",
  "standing-desk": "双电机升降 · 木纹桌面",
  luggage: "圆角箱体 · 万向轮",
  clothing: "半身人台 · 轻量服装壳",
  cup: "保温杯 · 螺纹杯盖",
  router: "扁平机身 · 折叠天线",
  "wireless-earbuds": "入耳式 · 充电盒",
  "wired-earbuds": "有线入耳 · 编织线材",
  "gaming-headphones": "头戴式 · 可拆卸麦克风",
  "anc-headphones": "头戴式 · 主动降噪",
};

const BASE_MODEL_OPTIONS = [
  ["lounge-chair", "休闲椅"],
  ["dining-chair", "餐椅"],
  ["stool", "坐凳"],
  ["table-lamp", "台灯"],
  ["floor-lamp", "落地灯"],
  ["speaker", "音箱"],
  ["turntable", "唱机"],
  ["camera", "相机"],
  ["projector", "投影仪"],
  ["coffee-table", "茶几"],
  ["side-table", "边几"],
  ["loveseat", "双人椅"],
  ["office-chair", "人体工学椅"],
  ["monitor", "显示器"],
  ["laptop", "笔记本电脑"],
  ["cabinet", "收纳柜"],
  ["bed", "床"],
  ["plant", "绿植"],
  ["appliance", "桌面电器"],
  ["vessel", "花器"],
  ["generated", "生成模型"],
  ["wireless-earbuds", "蓝牙耳机"],
  ["wired-earbuds", "有线耳机"],
  ["gaming-headphones", "游戏耳机"],
  ["anc-headphones", "降噪耳机"],
];

const PROTOTYPE_MODELS = [
  { code: "P01", key: "wireless-earbuds", name: "入耳式真无线耳机", category: "耳机 / 蓝牙耳机" },
  { code: "P02", key: "ear-clip", name: "耳夹式耳机", category: "耳机 / 耳夹式耳机" },
  { code: "P03", key: "ear-hook", name: "挂耳式耳机", category: "耳机 / 挂耳式耳机" },
  { code: "P04", key: "bone-conduction", name: "骨传导耳机", category: "耳机 / 骨传导耳机" },
  { code: "P05", key: "anc-headphones", name: "头戴式降噪耳机", category: "耳机 / 头戴降噪耳机" },
  { code: "P06", key: "gaming-headphones", name: "头戴式游戏耳机", category: "耳机 / 头戴游戏耳机" },
  { code: "P07", key: "wired-earbuds", name: "有线入耳式耳机", category: "耳机 / 有线耳机" },
  { code: "P08", key: "keyboard", name: "机械键盘", category: "电脑外设 / 键盘" },
  { code: "P09", key: "mouse", name: "电竞鼠标", category: "电脑外设 / 鼠标" },
  { code: "P10", key: "mousepad", name: "鼠标垫", category: "电脑外设 / 鼠标垫" },
  { code: "P11", key: "office-chair", name: "人体工学椅", category: "家居生活 / 人体工学椅" },
  { code: "P12", key: "monitor", name: "显示器", category: "电脑外设 / 显示器" },
  { code: "P13", key: "monitor-arm", name: "显示器支架", category: "电脑外设 / 显示器支架" },
  { code: "P14", key: "projector", name: "投影仪", category: "影像设备 / 投影仪" },
  { code: "P15", key: "tv", name: "电视", category: "影像设备 / 电视" },
  { code: "P16", key: "speaker", name: "桌面音响", category: "音频设备 / 音响" },
  { code: "P17", key: "power-bank", name: "充电宝", category: "数码配件 / 充电宝" },
  { code: "P18", key: "charger", name: "氮化镓充电头", category: "数码配件 / 充电头" },
  { code: "P19", key: "phone-cooler", name: "手机散热背夹", category: "数码配件 / 手机散热器" },
  { code: "P20", key: "controller", name: "游戏手柄", category: "电脑外设 / 游戏手柄" },
  { code: "P21", key: "ssd", name: "移动固态硬盘", category: "电脑外设 / 移动硬盘" },
  { code: "P22", key: "phone", name: "手机", category: "数码配件 / 手机" },
  { code: "P23", key: "tablet", name: "平板", category: "数码配件 / 平板" },
  { code: "P24", key: "robot-vacuum", name: "扫地机器人", category: "清洁电器 / 扫地机器人" },
  { code: "P25", key: "vacuum", name: "洗地机 / 吸尘器", category: "清洁电器 / 洗地机 / 吸尘器" },
  { code: "P26", key: "fridge", name: "冰箱", category: "家居生活 / 冰箱" },
  { code: "P27", key: "air-conditioner", name: "壁挂空调", category: "家居生活 / 空调" },
  { code: "P28", key: "toothbrush", name: "电动牙刷", category: "健康个护 / 电动牙刷" },
  { code: "P29", key: "shaver", name: "刮胡刀", category: "健康个护 / 刮胡刀" },
  { code: "P30", key: "blood-pressure", name: "臂式血压计", category: "健康个护 / 血压计" },
  { code: "P31", key: "hearing-aid", name: "助听器", category: "健康个护 / 助听器" },
  { code: "P32", key: "massager", name: "颈 / 眼按摩仪", category: "健康个护 / 按摩仪" },
  { code: "P33", key: "massage-chair", name: "按摩椅", category: "健康个护 / 按摩椅" },
  { code: "P34", key: "treadmill", name: "跑步机", category: "运动健身 / 跑步机" },
  { code: "P35", key: "standing-desk", name: "升降桌", category: "家居生活 / 升降桌" },
  { code: "P36", key: "luggage", name: "行李箱", category: "家居生活 / 行李箱" },
  { code: "P37", key: "clothing", name: "服装陈列", category: "家居生活 / 服饰" },
  { code: "P38", key: "cup", name: "保温杯", category: "家居生活 / 水杯" },
  { code: "P39", key: "router", name: "路由器", category: "网络服务 / 路由器" },
  { code: "P40", key: null, name: "宽带（服务，无实体）", category: "网络服务 / 宽带" },
];

const BASE_MODEL_KEYS = new Set(BASE_MODEL_OPTIONS.map(([key]) => key));
const PROTOTYPE_MODEL_OPTIONS = PROTOTYPE_MODELS
  .filter((item) => item.key && !BASE_MODEL_KEYS.has(item.key))
  .map((item) => [item.key, `${item.code} ${item.name}`]);
const MODEL_OPTIONS = [...BASE_MODEL_OPTIONS, ...PROTOTYPE_MODEL_OPTIONS];
const MODEL_LABELS = new Map(MODEL_OPTIONS);
const BASE_GRID_OPTIONS = BASE_MODEL_OPTIONS.filter(
  ([key]) => !PROTOTYPE_MODELS.some((item) => item.key === key)
);

const FINISH_OPTIONS = [
  ["default", "原色", "#D8D1C7"],
  ["oak", "暖木", "#B08F70"],
  ["sage", "灰绿", "#A3A8A0"],
  ["clay", "藕粉", "#C4A69B"],
  ["graphite", "石墨", "#5E5750"],
];

const THUMBNAILS = {
  "lounge-chair": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M12 25.5h28v7.5H12z" fill="#DDD9D4"/>
      <path d="M14 25.5V17c0-2.2 1.8-4 4-4h2.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M13.5 33v7M38.5 33v7M18 33v5.5M34 33v5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M35 18.5h2.5c2.2 0 4 1.8 4 4v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".65"/>
    </svg>`,
  "dining-chair": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M15 28h22v4.5H15z" fill="#DDD9D4"/>
      <path d="M17 28V13M35 28V13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M17 18h18M17 22.5h18" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
      <path d="M16.5 32.5 14 43M35.5 32.5 38 43M20 32.5 19 40M32 32.5l1 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  stool: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <ellipse cx="26" cy="20.5" rx="13" ry="4.5" fill="#DDD9D4"/>
      <ellipse cx="26" cy="19.5" rx="13" ry="4.5" stroke="currentColor" stroke-width="1.1" opacity=".55"/>
      <path d="m16.5 23.5-3 19M26 25v19M35.5 23.5l3 19M18 31.5h16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  "table-lamp": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="m18 13 16 0 5 12H13l5-12Z" fill="#C4A69B" fill-opacity=".8"/>
      <path d="M26 25v13" stroke="currentColor" stroke-width="1.2"/>
      <path d="M17 43c0-2.8 4-5 9-5s9 2.2 9 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M26 8v3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
    </svg>`,
  "floor-lamp": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M18.5 8h15l4.5 12h-24l4.5-12Z" fill="#C4A69B" fill-opacity=".8"/>
      <path d="M26 20v22" stroke="currentColor" stroke-width="1.2"/>
      <path d="M16 45.5c0-2.4 4.5-4 10-4s10 1.6 10 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M21 25h10" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
    </svg>`,
  speaker: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="14" y="8.5" width="24" height="36" rx="3" fill="#DDD9D4"/>
      <circle cx="26" cy="24" r="7.5" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="26" cy="24" r="2.4" fill="#C4A69B"/>
      <circle cx="26" cy="37" r="3.3" stroke="currentColor" stroke-width="1.1" opacity=".7"/>
      <path d="M23 12h6" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
    </svg>`,
  turntable: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="7" y="16" width="38" height="22" rx="2.5" fill="#DDD9D4"/>
      <circle cx="23" cy="27" r="9" fill="#FAF9F7" stroke="currentColor" stroke-width="1.1"/>
      <circle cx="23" cy="27" r="2.5" fill="#C4A69B"/>
      <path d="m35.5 19.5 4.5 6-7.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="36" cy="19" r="1.5" fill="currentColor" opacity=".7"/>
    </svg>`,
  camera: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M10 19.5h7l2.5-4h13l2.5 4h7v22H10v-22Z" fill="#DDD9D4"/>
      <circle cx="26" cy="30" r="8" fill="#FAF9F7" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="26" cy="30" r="3.5" stroke="currentColor" stroke-width="1.1" opacity=".6"/>
      <path d="M35 23h3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>
      <rect x="16" y="16.5" width="5" height="3.5" rx="1" fill="#C4A69B"/>
    </svg>`,
  projector: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="8" y="19" width="36" height="19" rx="3.5" fill="#DDD9D4"/>
      <circle cx="34.5" cy="28.5" r="5.3" fill="#FAF9F7" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="34.5" cy="28.5" r="2" fill="#C4A69B"/>
      <path d="M14 25h10M14 29h10M14 33h7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".5"/>
      <path d="M20 19v-2.5h10V19" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>
    </svg>`,
  "coffee-table": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M7 23h38v4H7z" fill="#DDD9D4"/>
      <path d="M11 27v16M41 27v16M11 38h30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M7 23h38" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
    </svg>`,
  "side-table": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <ellipse cx="26" cy="21" rx="15" ry="4.5" fill="#DDD9D4"/>
      <path d="m17 24-3 20M26 25.5V44M35 24l3 20" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="26" cy="19.5" rx="15" ry="4.5" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
    </svg>`,
  loveseat: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M8 27h36v6H8z" fill="#DDD9D4"/>
      <path d="M9.5 27V17c0-1.6 1.3-3 3-3h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M42.5 27V17c0-1.6-1.3-3-3-3h-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M10 33v8M42 33v8M16 33v6M36 33v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M25.5 22v5" stroke="currentColor" stroke-width="1.1" opacity=".4"/>
    </svg>`,
  "office-chair": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M17 27h18v4H17z" fill="#DDD9D4"/>
      <path d="M21 27V12c0-1.5 1.2-2.7 2.7-2.7h4.6C29.8 9.3 31 10.5 31 12v15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M22 8.5h8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
      <path d="M20 31v5M32 31v5M26 31v8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M18 44h16M20 44l-2 4M32 44l2 4M26 44v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M15.5 24h4M33 24h3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
    </svg>`,
  monitor: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="7" y="10" width="38" height="24" rx="2.5" fill="#DDD9D4"/>
      <rect x="10" y="13" width="32" height="18" rx="1" fill="#FAF9F7"/>
      <path d="M26 34v7M18 43h16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M24 38h4" stroke="currentColor" stroke-width="1.1" opacity=".45"/>
    </svg>`,
  laptop: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M14 13h24v20H14z" fill="#DDD9D4"/>
      <path d="M17 16h18v14H17z" fill="#FAF9F7"/>
      <path d="M8 36h36l-3 5H11l-3-5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M23 36h6" stroke="currentColor" stroke-width="1.1" opacity=".5"/>
    </svg>`,
  cabinet: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="14" y="7" width="24" height="38" rx="2" fill="#DDD9D4"/>
      <path d="M26 9v34M20 25h2M30 25h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M17 45v2M35 45v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  bed: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M7 30h38v8H7z" fill="#DDD9D4"/>
      <path d="M9 30V20h5v10M38 30V20h5v10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M14 25h24M14 28h24" stroke="currentColor" stroke-width="1.1" opacity=".5"/>
      <path d="M10 38v6M42 38v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  plant: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M20 30h12l-2 14h-8l-2-14Z" fill="#DDD9D4"/>
      <path d="M26 30V17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M26 23c-6-1-8-6-8-10 5 0 8 4 8 10ZM26 20c5-1 7-5 7-8-4 0-7 3-7 8Z" fill="#A3A8A0" fill-opacity=".45" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
      <path d="M22 34h8" stroke="currentColor" stroke-width="1" opacity=".4"/>
    </svg>`,
  appliance: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="12" y="10" width="28" height="31" rx="3" fill="#DDD9D4"/>
      <rect x="18" y="17" width="16" height="6" rx="1.5" fill="#FAF9F7" stroke="currentColor" stroke-width="1"/>
      <path d="M20 28h12M20 33h12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>
      <path d="M24 41h6v4h-6z" stroke="currentColor" stroke-width="1.1"/>
    </svg>`,
  vessel: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M20 13h12c-1 4-2 6-2 10 0 5 4 7 4 13 0 6-3 8-8 8s-8-2-8-8c0-6 4-8 4-13 0-4-1-6-2-10Z" fill="#DDD9D4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M22 13h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M20 31h12" stroke="currentColor" stroke-width="1" opacity=".45"/>
    </svg>`,
  generated: `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M15 39h22l-2 5H17l-2-5Z" fill="#DDD9D4"/>
      <rect x="19" y="25" width="14" height="11" rx="3" fill="#C4A69B" fill-opacity=".7"/>
      <circle cx="26" cy="18" r="7" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <path d="M26 7v4M39 18h4M9 18h4M35 9l3 3M14 27l3-3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
    </svg>`,
  "wireless-earbuds": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="12" y="22" width="28" height="18" rx="7" fill="#DDD9D4"/>
      <path d="M18 22v-3.5c0-4.5 3.6-8 8-8s8 3.5 8 8V22" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="20.5" cy="31" r="3.2" fill="#FAF9F7" stroke="currentColor" stroke-width="1.1"/>
      <circle cx="31.5" cy="31" r="3.2" fill="#FAF9F7" stroke="currentColor" stroke-width="1.1"/>
      <path d="M26 36v2" stroke="currentColor" stroke-width="1.1" opacity=".5"/>
    </svg>`,
  "wired-earbuds": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <circle cx="17" cy="16" r="4.2" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <circle cx="35" cy="16" r="4.2" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <path d="M17 20c0 7-5 7-5 13s4 8 4 10M35 20c0 7 5 7 5 13s-4 8-4 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M12 26h5M39 26h-5" stroke="currentColor" stroke-width="1.1" opacity=".5"/>
    </svg>`,
  "gaming-headphones": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M12 33V25c0-7.2 5.8-13 13-13h2c7.2 0 13 5.8 13 13v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <rect x="8" y="29" width="9" height="14" rx="4" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <rect x="35" y="29" width="9" height="14" rx="4" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <path d="M36 39c-3 1-5 3-7 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="27" cy="45" r="2" fill="#C4A69B"/>
    </svg>`,
  "anc-headphones": `
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M11 34V25c0-8 6-14 15-14s15 6 15 14v9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="15" cy="34" rx="6.5" ry="9" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <ellipse cx="37" cy="34" rx="6.5" ry="9" fill="#DDD9D4" stroke="currentColor" stroke-width="1.1"/>
      <path d="M15 28v12M37 28v12" stroke="currentColor" stroke-width="1.1" opacity=".5"/>
      <circle cx="26" cy="16" r="2" fill="#C4A69B"/>
    </svg>`,
};

const state = {
  user: null,
  products: [],
  categories: [],
  borrowers: [],
  history: [],
  historyAll: [],
  selectedId: null,
  activeCategoryId: null,
  expandedCategoryIds: new Set(),
  showEmptyCategories: false,
  page: 1,
  pageSize: 20,
  viewer: null,
  rentGroups: [],
  returnItems: [],
  editingCategoryId: null,
  adminOpen: false,
  adminFoldedCategoryIds: new Set(),
  adminHideTimer: null,
  modelOpen: false,
  modelOriginalProduct: null,
  modelDraft: null,
  modelHideTimer: null,
  customModels: [],
  hiddenModels: new Set(),
  modelUsage: new Map(),
  modelLibrary: { builtin: [], custom: [], hidden: [] },
  modelLibraryTab: "custom",
  historyRequest: 0,
  toastTimer: null,
  searchTimer: null,
  dialogProductId: null,
  borrowAlternatives: [],
  adminNoteData: "",
  noteProductId: null,
  galleryQuery: "",
  galleryFullscreen: false,
  notePlaceholder: DEFAULT_NOTE_PLACEHOLDER,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

// 中文按拼音、数字按大小排序，让同品牌 / 同系列的名字自然排在一起。
const NAME_COLLATOR = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return String(iso).replaceAll("-", ".");
}

function setHeaderDate() {
  const now = new Date();
  els.headerDate.textContent = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}

const SHOW_EMPTY_KEY = "echo.show-empty-categories";

function readShowEmptyPreference() {
  try {
    return window.localStorage.getItem(SHOW_EMPTY_KEY) === "1";
  } catch {
    return false;
  }
}

function saveShowEmptyPreference(value) {
  try {
    window.localStorage.setItem(SHOW_EMPTY_KEY, value ? "1" : "0");
  } catch {
    // 本地存储不可用时只影响偏好记忆，不影响浏览。
  }
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 3200);
}

function isAdmin() {
  return state.user?.role === "admin";
}

function operatorCell(record) {
  const lend = record.lend_operator || "";
  const ret = record.return_operator || "";
  if (!lend && !ret) return "—";
  const parts = [];
  if (lend) parts.push(`借：${escapeHtml(lend)}`);
  if (ret) parts.push(`还：${escapeHtml(ret)}`);
  return `<span class="op-stack">${parts.map((part) => `<span>${part}</span>`).join("")}</span>`;
}

function applyUser() {
  const user = state.user;
  if (!user) return;
  document.body.dataset.role = user.role;
  if (els.adminEyebrow) {
    els.adminEyebrow.textContent = isAdmin() ? "ADMIN CONSOLE" : "ADD PRODUCT";
  }
  if (els.adminTitle) {
    els.adminTitle.textContent = isAdmin() ? "品类与产品" : "添加产品";
  }
  if (els.userChip) {
    els.userChip.hidden = false;
    els.userName.textContent = user.display_name || user.username;
  }
}

async function api(path, options = {}) {
  const init = { ...options };
  if (init.body && typeof init.body === "object") {
    init.headers = { "Content-Type": "application/json", ...(init.headers || {}) };
    init.body = JSON.stringify(init.body);
  }
  const response = await fetch(path, init);
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 401) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`/login?next=${next}`);
    throw new Error("登录已失效，正在跳转登录页…");
  }
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(data?.error || `请求失败（${response.status}）`);
  }
  return data;
}

function getSelectedProduct() {
  return state.products.find((product) => product.id === state.selectedId) || null;
}

function productHasNote(product) {
  return Boolean(product && (product.note_text || product.note_image_url));
}

function syncModalOpenClass() {
  document.body.classList.toggle("modal-open", Boolean($("dialog[open]")));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("文件读取失败，请重试"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("照片解析失败，请换一张试试"));
    image.src = source;
  });
}

async function compressNoteImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("请选择 JPG / PNG / WebP 照片");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("照片不能超过 8 MB");
  }
  const source = await readFileAsDataURL(file);
  const image = await loadImageElement(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("照片尺寸无效，请换一张试试");

  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  let compressed = canvas.toDataURL("image/jpeg", 0.84);
  if (compressed.length > 1.2 * 1024 * 1024) {
    compressed = canvas.toDataURL("image/jpeg", 0.7);
  }
  if (compressed.length > 1.3 * 1024 * 1024) {
    throw new Error("照片压缩后仍然过大，请换一张");
  }
  return compressed;
}

function updateAdminNoteCount() {
  const length = Array.from(els.adminNoteText.value).length;
  els.adminNoteCount.textContent = `${length} / 300`;
}

function resetAdminNote() {
  state.adminNoteData = "";
  els.adminNoteText.value = "";
  els.adminNoteFile.value = "";
  els.adminNotePreview.hidden = true;
  els.adminNotePreviewImg.removeAttribute("src");
  els.adminNoteFilename.textContent = "";
  els.adminNoteError.textContent = "";
  updateAdminNoteCount();
}

function applyNotePlaceholder(value) {
  const text = typeof value === "string" ? value : "";
  state.notePlaceholder = text;
  els.adminNoteText.placeholder = text;
  if (els.notePlaceholderInput) els.notePlaceholderInput.value = text;
}

async function fetchSettings() {
  try {
    const settings = await api("/api/settings");
    applyNotePlaceholder(settings?.note_placeholder ?? DEFAULT_NOTE_PLACEHOLDER);
  } catch (error) {
    console.warn("settings load failed", error);
    applyNotePlaceholder(DEFAULT_NOTE_PLACEHOLDER);
  }
}

async function saveNotePlaceholder(value) {
  const text = String(value ?? "").trim();
  els.notePlaceholderError.textContent = "";
  const original = els.notePlaceholderSave.textContent;
  els.notePlaceholderSave.disabled = true;
  els.notePlaceholderSave.textContent = "保存中…";
  try {
    const settings = await api("/api/settings", {
      method: "PATCH",
      body: { note_placeholder: text },
    });
    applyNotePlaceholder(settings.note_placeholder);
    showToast("备注提示语已更新");
  } catch (error) {
    els.notePlaceholderError.textContent = error.message;
  } finally {
    els.notePlaceholderSave.disabled = false;
    els.notePlaceholderSave.textContent = original;
  }
}

function submitNotePlaceholder(event) {
  event.preventDefault();
  saveNotePlaceholder(els.notePlaceholderInput.value);
}

function resetNotePlaceholder() {
  els.notePlaceholderInput.value = DEFAULT_NOTE_PLACEHOLDER;
  saveNotePlaceholder(DEFAULT_NOTE_PLACEHOLDER);
}

function openNotePlaceholderEditor() {
  if (!els.notePlaceholderSection) return;
  els.notePlaceholderSection.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    if (!state.adminOpen) return;
    els.notePlaceholderInput.focus({ preventScroll: true });
    els.notePlaceholderInput.select();
  }, 280);
}

async function handleAdminNoteFileChange() {
  const file = els.adminNoteFile.files?.[0];
  if (!file) return;
  els.adminNoteError.textContent = "";
  try {
    const data = await compressNoteImage(file);
    state.adminNoteData = data;
    els.adminNotePreviewImg.src = data;
    els.adminNotePreview.hidden = false;
    els.adminNoteFilename.textContent = `${file.name} · ${formatBytes(file.size)}`;
    els.adminNoteFilename.title = file.name;
  } catch (error) {
    state.adminNoteData = "";
    els.adminNoteFile.value = "";
    els.adminNotePreview.hidden = true;
    els.adminNotePreviewImg.removeAttribute("src");
    els.adminNoteFilename.textContent = "";
    els.adminNoteError.textContent = error.message;
  }
}

function removeAdminNoteImage() {
  state.adminNoteData = "";
  els.adminNoteFile.value = "";
  els.adminNotePreview.hidden = true;
  els.adminNotePreviewImg.removeAttribute("src");
  els.adminNoteFilename.textContent = "";
  els.adminNoteError.textContent = "";
}

function productNotePayload() {
  return {
    note_text: els.adminNoteText.value.trim(),
    note_image: state.adminNoteData,
  };
}

function openNoteDialog(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  state.noteProductId = product.id;
  const hasText = Boolean(product.note_text);
  const hasImage = Boolean(product.note_image_url);

  els.noteProductName.textContent = product.name;
  els.noteCategory.textContent = `${product.category_path} · ${product.asset_code}`;
  els.noteText.textContent = product.note_text || "";
  els.noteText.hidden = !hasText;
  els.noteBody.hidden = !hasText && !hasImage;
  els.noteEmpty.hidden = hasText || hasImage;

  if (hasImage) {
    els.noteImage.src = product.note_image_url;
    els.noteImage.alt = `${product.name} 的备注照片`;
    els.noteImageLink.href = product.note_image_url;
    els.noteImageWrap.hidden = false;
  } else {
    els.noteImage.removeAttribute("src");
    els.noteImage.alt = "";
    els.noteImageLink.removeAttribute("href");
    els.noteImageWrap.hidden = true;
  }

  els.noteDialog.showModal();
  syncModalOpenClass();
}

function modelKey(product) {
  return parseModelUrl(product?.model_url).key;
}

function borrowableAlternatives(product) {
  if (!product) return [];
  const key = modelKey(product);
  return state.products.filter((item) => {
    if (item.id === product.id || item.status !== "in_stock") return false;
    if (item.name === product.name && item.category_id === product.category_id) return true;
    return (
      modelKey(item) === key
      && item.category_parent
      && item.category_parent === product.category_parent
    );
  });
}

function walkCategories(nodes, visitor) {
  for (const node of nodes) {
    visitor(node);
    if (node.children.length) walkCategories(node.children, visitor);
  }
}

function findCategory(categoryId) {
  let found = null;
  walkCategories(state.categories, (node) => {
    if (node.id === categoryId) found = node;
  });
  return found;
}

function collectCategoryIds(category) {
  const ids = [category.id];
  for (const child of category.children) ids.push(...collectCategoryIds(child));
  return ids;
}

function categoryIdsFor(categoryId) {
  const category = findCategory(categoryId);
  return category ? collectCategoryIds(category) : [];
}

function categoryContains(category, categoryId) {
  if (!category || categoryId == null) return false;
  if (category.id === categoryId) return true;
  return category.children.some((child) => categoryContains(child, categoryId));
}

function categoryHasActiveDescendant(category) {
  return category.children.some((child) => categoryContains(child, state.activeCategoryId));
}

function hasEmptyCategory(nodes) {
  return nodes.some((node) => {
    if (!node.children.length) return node.product_count === 0;
    return hasEmptyCategory(node.children);
  });
}

function expandCategoryAncestors(categoryId) {
  let current = findCategory(categoryId);
  while (current?.parent_id) {
    state.expandedCategoryIds.add(current.parent_id);
    current = findCategory(current.parent_id);
  }
}

function visibleCategoryTree(nodes) {
  return nodes.reduce((result, node) => {
    const children = visibleCategoryTree(node.children);
    const keep = state.showEmptyCategories
      || node.product_count > 0
      || children.length > 0
      || categoryContains(node, state.activeCategoryId);
    if (keep) result.push({ ...node, children });
    return result;
  }, []);
}

function flattenCategories(nodes = state.categories, depth = 1) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children.length) result.push(...flattenCategories(node.children, depth + 1));
  }
  return result;
}

function categoryPath(category) {
  const names = [];
  let current = category;
  while (current) {
    names.unshift(current.name);
    current = current.parent_id ? findCategory(current.parent_id) : null;
  }
  return names.join(" / ");
}

function suggestModelForCategory(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return null;
  const inferred = inferModelFromName(categoryPath(category));
  return allModelOptions().some(([key]) => key === inferred.modelKey) ? inferred.modelKey : null;
}

function allModelOptions() {
  return [
    ...MODEL_OPTIONS.filter(([key]) => !state.hiddenModels.has(key)),
    ...state.customModels.map((model) => [model.key, model.name]),
  ];
}

function baseGridOptions() {
  return BASE_GRID_OPTIONS.filter(([key]) => !state.hiddenModels.has(key));
}

function customModel(key) {
  return state.customModels.find((model) => model.key === key) || null;
}

function isCustomModel(key) {
  return Boolean(customModel(key));
}

function getInitial(name) {
  const characters = Array.from(String(name || "").trim());
  const first = characters[0] || "?";
  return /[a-z]/.test(first) ? first.toUpperCase() : first;
}

function updateQueryString(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildModelOptions(selected) {
  return allModelOptions().map(([value, label]) =>
    `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`
  ).join("");
}

// ---------------------------------------------------------------------------
// Products and categories
// ---------------------------------------------------------------------------

function visibleProducts() {
  if (!state.activeCategoryId) return state.products;
  const allowed = new Set(categoryIdsFor(state.activeCategoryId));
  return state.products.filter((product) => allowed.has(product.category_id));
}

// 保持服务端返回的品类顺序，只在同一品类内按名称排，名字相近的自然相邻。
function sortProductsByName(products) {
  const groups = new Map();
  for (const product of products) {
    if (!groups.has(product.category_id)) groups.set(product.category_id, []);
    groups.get(product.category_id).push(product);
  }
  return Array.from(groups.values()).flatMap((group) =>
    group.sort((a, b) => NAME_COLLATOR.compare(a.name, b.name)),
  );
}

function ensureSelection() {
  const products = visibleProducts();
  if (!products.length) {
    state.selectedId = null;
    return null;
  }
  if (!products.some((product) => product.id === state.selectedId)) {
    state.selectedId = products[0].id;
  }
  return getSelectedProduct();
}

function renderCategoryNode(node, depth, rootIndex = 0) {
  const hasChildren = node.children.length > 0;
  const descendantActive = categoryHasActiveDescendant(node);
  const expanded = state.expandedCategoryIds.has(node.id);
  const active = state.activeCategoryId === node.id;
  const parentActive = !active && descendantActive;
  const buttonClass = depth === 1 ? "category-root-button" : "category-child-button";
  const index = depth === 1
    ? `<span class="category-index">${String(rootIndex + 1).padStart(2, "0")}</span>`
    : "";
  const caret = hasChildren
    ? `<svg class="category-caret" viewBox="0 0 8 12" fill="none" aria-hidden="true"><path d="m2 2 4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : "";
  const children = expanded && hasChildren
    ? `<div class="category-children">${node.children
        .map((child) => renderCategoryNode(child, depth + 1))
        .join("")}</div>`
    : "";
  const expandedAttr = hasChildren ? `aria-expanded="${expanded}"` : "";
  const currentAttr = active ? `aria-current="true"` : "";

  return `
    <div class="category-group${expanded ? " is-expanded" : ""}">
      <button class="category-button ${buttonClass}${active ? " is-active" : ""}${parentActive ? " is-parent-active" : ""}"
              type="button" data-category-id="${node.id}"
              ${expandedAttr} ${currentAttr}>
        ${index}
        <span class="category-name">${escapeHtml(node.name)}</span>
        <span class="category-count">${node.product_count}</span>
        ${caret}
      </button>
      ${children}
    </div>
  `;
}

function renderCategories() {
  const total = state.products.length;
  const allActive = state.activeCategoryId === null ? " is-active" : "";
  const roots = visibleCategoryTree(state.categories);
  const hasEmpty = hasEmptyCategory(state.categories);

  els.categoryEmptyToggle.hidden = !hasEmpty;
  if (hasEmpty) {
    els.categoryEmptyToggle.textContent = state.showEmptyCategories ? "隐藏空类目" : "显示空类目";
    els.categoryEmptyToggle.setAttribute("aria-pressed", String(state.showEmptyCategories));
  }

  const groups = roots.length
    ? roots.map((root, index) => renderCategoryNode(root, 1, index)).join("")
    : `<p class="category-empty-note">暂无可浏览的品类，可在管理面板中添加产品。</p>`;

  els.categoryList.innerHTML = `
    <button class="category-button category-all-button${allActive}" type="button" data-category-id="all">
      <span class="category-index">00</span>
      <span class="category-name">全部</span>
      <span class="category-count">${total}</span>
    </button>
    ${groups}
  `;
}

function selectCategory(value) {
  if (state.modelOpen) closeModelStudio();
  if (value === "all") {
    state.activeCategoryId = null;
    state.expandedCategoryIds.clear();
  } else {
    const categoryId = Number(value);
    const category = findCategory(categoryId);
    if (!category) return;
    if (category.children.length) {
      if (state.expandedCategoryIds.has(categoryId)) {
        state.expandedCategoryIds.delete(categoryId);
      } else {
        state.expandedCategoryIds.add(categoryId);
        expandCategoryAncestors(categoryId);
      }
    }
    state.activeCategoryId = categoryId;
  }
  ensureSelection();
  renderCategories();
  window.requestAnimationFrame(() => {
    const active = $(
      ".category-child-button.is-active, .category-root-button.is-active",
      els.categoryList,
    );
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
  renderProductStrip();
  updateViewerInfo();
}

function renderProductStrip() {
  const products = visibleProducts();
  els.collectionCount.textContent = `${products.length} 件`;
  if (!products.length) {
    els.productStrip.innerHTML = `<div class="strip-empty">这个品类暂时没有器物。</div>`;
    window.requestAnimationFrame(updateStripArrows);
    return;
  }

  els.productStrip.innerHTML = products.map((product) => {
    const active = product.id === state.selectedId ? " is-active" : "";
    const rented = product.status === "rented";
    const note = productHasNote(product);
    const key = modelKey(product);
    const deleteLabel = rented
      ? `「${escapeHtml(product.name)}」正在借出，归还后可删除`
      : `删除「${escapeHtml(product.name)}」`;
    return `
      <div class="product-card-wrap">
        <button class="product-card${active}${rented ? " is-rented" : ""}${note ? " has-note" : ""}" type="button" data-product-id="${product.id}"
                aria-pressed="${product.id === state.selectedId}" title="${escapeHtml(product.name)} · ${escapeHtml(product.asset_code)}">
          <span class="thumb">${THUMBNAILS[key] || THUMBNAILS[isCustomModel(key) ? "generated" : "lounge-chair"]}</span>
          <span class="pc-overline">${escapeHtml(product.asset_code)} / ${escapeHtml(product.category)}</span>
          <span class="pc-name">${escapeHtml(product.name)}</span>
          <span class="pc-foot">
            <i class="pc-dot${rented ? " is-rented" : ""}" aria-hidden="true"></i>
            ${rented ? "出租中" : "在库"}
            ${rented ? `<span class="pc-borrower">${escapeHtml(product.current_borrower || "")}</span>` : ""}
          </span>
        </button>
        ${note ? `
          <button class="product-note" type="button" data-product-note="${product.id}"
                  aria-label="查看「${escapeHtml(product.name)}」的备注" title="查看备注">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3.5h10v7.2H7.4L4.6 13v-2.3H3V3.5Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
              <path d="M5.4 6h5.2M5.4 8.2h3.4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </button>` : ""}
        <button class="product-delete" type="button" data-product-delete="${product.id}"
                aria-label="${deleteLabel}" title="${deleteLabel}"${rented ? " disabled" : ""}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.4 8h5.2l.4-8M7 7v3.2M9 7v3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;
  }).join("");
  window.requestAnimationFrame(updateStripArrows);
}

function updateStripArrows() {
  const strip = els.productStrip;
  const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
  const scrollable = maxScroll > 2;
  strip.parentElement?.classList.toggle("is-scrollable", scrollable);
  els.stripPrev.disabled = !scrollable || strip.scrollLeft <= 8;
  els.stripNext.disabled = !scrollable || strip.scrollLeft >= maxScroll - 8;
}

function scrollProductStrip(direction) {
  const amount = Math.max(190, els.productStrip.clientWidth * 0.78);
  els.productStrip.scrollBy({ left: amount * direction, behavior: "smooth" });
}

function galleryFilteredProducts() {
  const query = els.gallerySearch.value.trim().toLowerCase();
  if (!query) return state.products;
  return state.products.filter((product) =>
    `${product.name} ${product.asset_code} ${product.category_path} ${product.category}`
      .toLowerCase()
      .includes(query)
  );
}

function renderGallery() {
  const items = galleryFilteredProducts();
  const total = state.products.length;
  const query = els.gallerySearch.value.trim();
  els.gallerySummary.textContent = query
    ? `找到 ${items.length} 件 / 共 ${total} 件器物`
    : `共 ${total} 件器物，点选任意一件回到产品视图。`;
  els.galleryEmpty.hidden = items.length > 0;
  els.galleryGrid.hidden = items.length === 0;

  els.galleryGrid.innerHTML = items.map((product) => {
    const rented = product.status === "rented";
    const key = modelKey(product);
    const note = productHasNote(product)
      ? `<button class="gallery-note" type="button" data-gallery-note="${product.id}"
                 aria-label="查看「${escapeHtml(product.name)}」的备注" title="查看备注">
           <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
             <path d="M3 3.5h10v7.2H7.4L4.6 13v-2.3H3V3.5Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
             <path d="M5.4 6h5.2M5.4 8.2h3.4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
           </svg>
           备注
         </button>`
      : "";
    const status = rented
      ? `出租中${product.current_borrower ? ` · ${escapeHtml(product.current_borrower)}` : ""}`
      : "在库";
    return `
      <div class="gallery-item">
        <button class="gallery-item-main" type="button" data-gallery-product="${product.id}"
                title="选中「${escapeHtml(product.name)}」">
          <span class="gallery-thumb">${THUMBNAILS[key] || THUMBNAILS[isCustomModel(key) ? "generated" : "lounge-chair"]}</span>
          <span class="gallery-overline">${escapeHtml(product.asset_code)} / ${escapeHtml(product.category)}</span>
          <span class="gallery-name">${escapeHtml(product.name)}</span>
        </button>
        <div class="gallery-item-foot">
          <span class="gallery-state${rented ? " is-rented" : ""}"><i aria-hidden="true"></i>${status}</span>
          ${note}
        </div>
      </div>
    `;
  }).join("");
}

function openGallery() {
  els.gallerySearch.value = "";
  renderGallery();
  els.galleryDialog.showModal();
  syncModalOpenClass();
}

function selectGalleryProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  state.selectedId = product.id;
  state.activeCategoryId = product.category_id;
  expandCategoryAncestors(product.category_id);
  if (els.galleryDialog.open) els.galleryDialog.close();
  renderProducts();
  setView("products", { updateHash: true, smooth: false });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function syncGalleryFullscreen() {
  const active = document.fullscreenElement === els.galleryDialog;
  state.galleryFullscreen = active;
  if (els.galleryFullscreenLabel) {
    els.galleryFullscreenLabel.textContent = active ? "退出全屏" : "全屏";
  }
  els.galleryFullscreen.setAttribute("aria-pressed", String(active));
}

async function toggleGalleryFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (els.galleryDialog.requestFullscreen) {
      await els.galleryDialog.requestFullscreen();
    } else {
      showToast("当前浏览器不支持全屏，可直接使用大屏模式");
    }
  } catch {
    showToast("无法进入全屏，请检查浏览器权限");
  }
}

function updateViewerInfo() {
  const product = getSelectedProduct();
  if (!product) {
    els.productIndex.textContent = "—";
    els.productCategory.textContent = "COLLECTION";
    els.productName.textContent = "等待入库";
    els.productSubline.textContent = "这个品类暂时没有器物。";
    els.watermark.textContent = "—";
    els.productStatus.hidden = true;
    els.primaryAction.disabled = true;
    els.primaryAction.textContent = "暂无产品";
    els.primaryAction.classList.remove("is-return");
    els.secondaryAction.hidden = true;
    els.borrowSameAction.hidden = true;
    els.modelOpen.hidden = true;
    state.borrowAlternatives = [];
    state.viewer?.clearProduct();
    return;
  }

  const allIndex = state.products.findIndex((item) => item.id === product.id);
  const key = parseModelUrl(product.model_url).key;
  const rented = product.status === "rented";
  const alternatives = rented ? borrowableAlternatives(product) : [];
  state.borrowAlternatives = alternatives;

  els.modelOpen.hidden = false;
  els.borrowSameAction.hidden = !rented || alternatives.length === 0;
  if (!els.borrowSameAction.hidden) {
    els.borrowSameAction.textContent = `再借同类${alternatives.length > 1 ? ` · ${alternatives.length}` : ""}`;
  }

  els.productStatus.hidden = false;
  els.primaryAction.disabled = false;
  els.productIndex.textContent = `${String(allIndex + 1).padStart(2, "0")} / ${String(state.products.length).padStart(2, "0")}`;
  els.watermark.textContent = String(allIndex + 1).padStart(2, "0");
  els.productCategory.textContent = product.category_path;
  els.productName.textContent = product.name;
  els.productStatus.classList.toggle("is-rented", rented);
  els.productStatus.querySelector("span").textContent = rented ? "出租中" : "在库";

  if (rented) {
    els.productSubline.textContent = `借用人 ${product.current_borrower || "—"} · ${formatDate(product.current_lend_date)} 借出 · ${product.asset_code}`;
    els.primaryAction.textContent = "归还产品";
    els.primaryAction.classList.add("is-return");
    els.secondaryAction.hidden = false;
    els.secondaryAction.textContent = "查看借用人";
  } else {
    els.productSubline.textContent = `${MODEL_NOTES[key] || "内部器物 · 妥善借用"} · ${product.asset_code}`;
    els.primaryAction.textContent = "借出产品";
    els.primaryAction.classList.remove("is-return");
    els.secondaryAction.hidden = true;
  }

  state.viewer?.setProduct(product);
}

function selectProduct(productId, { scroll = false } = {}) {
  if (state.modelOpen) closeModelStudio();
  state.selectedId = productId;
  $$(".product-card", els.productStrip).forEach((card) => {
    const active = Number(card.dataset.productId) === productId;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", String(active));
    if (active && scroll) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
  updateViewerInfo();
}

function renderProducts() {
  ensureSelection();
  renderCategories();
  renderProductStrip();
  updateViewerInfo();
}

async function removeProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  if (product.status === "rented") {
    showToast(`「${product.name}」正在借出，请先归还再删除`);
    return;
  }
  const historyCount = state.historyAll.filter(
    (record) => record.product_id === productId,
  ).length;
  const confirmed = await askConfirm(
    `删除「${product.name}」？`,
    historyCount
      ? `编号 ${product.asset_code} 会从库存中移除，${historyCount} 条历史流水仍会保留。`
      : `编号 ${product.asset_code} 会从库存中移除，删除后不可恢复。`,
  );
  if (!confirmed) return;
  try {
    await api(`/api/products/${productId}`, { method: "DELETE" });
    if (state.modelOpen && state.modelOriginalProduct?.id === productId) {
      closeModelStudio({ restore: false });
    }
    await refreshAllData({ preserveSelection: true });
    // 删掉当前类目最后一件器物后回到「全部」，避免停留在空类目里。
    if (state.activeCategoryId && !visibleProducts().length) {
      state.activeCategoryId = null;
      renderProducts();
    }
    if (state.adminOpen) renderAdmin();
    showToast(`已删除「${product.name}」`);
  } catch (error) {
    showToast(error.message);
  }
}

// ---------------------------------------------------------------------------
// Borrowers
// ---------------------------------------------------------------------------

function renderBorrowers() {
  const borrowers = state.borrowers;
  const activeBorrowers = borrowers.filter((borrower) => borrower.total_count > 0);
  const totalItems = borrowers.reduce((sum, borrower) => sum + borrower.total_count, 0);
  els.borrowerSummary.textContent = borrowers.length
    ? `名录中共 ${borrowers.length} 位借用人，当前 ${activeBorrowers.length} 位有在借器物，共 ${totalItems} 件。`
    : "借用人名录还是空的，先添加第一位借用人。";

  els.borrowerGrid.hidden = borrowers.length === 0;
  els.borrowerEmpty.hidden = borrowers.length !== 0;

  els.borrowerGrid.innerHTML = borrowers.map((borrower, index) => {
    const items = borrower.items.map((item) => `
      <div class="borrower-item">
        <div class="borrower-item-main">
          <div class="borrower-item-name">${escapeHtml(item.product_name)}</div>
          <div class="borrower-item-meta">${formatDate(item.lend_date)} · 已借 ${item.days_borrowed} 天</div>
        </div>
        <div class="borrower-item-side">
          <span class="borrower-item-category" title="${escapeHtml(item.category_path)}">${escapeHtml(item.category)}</span>
          <span class="borrower-item-code">${escapeHtml(item.asset_code)}</span>
        </div>
      </div>
    `).join("");
    const active = borrower.total_count > 0;
    const historyLine = borrower.history_count
      ? `历史借用 ${borrower.history_count} 次${borrower.last_lend_date ? ` · 最近 ${formatDate(borrower.last_lend_date)}` : ""}`
      : "尚无借用记录";
    return `
      <article class="borrower-card" style="--i:${index}" data-borrower="${escapeHtml(borrower.borrower)}"
               data-borrower-id="${borrower.id}" tabindex="0">
        <div class="borrower-card-head">
          <span class="avatar${index % 2 ? " is-clay" : ""}" aria-hidden="true">${escapeHtml(getInitial(borrower.borrower))}</span>
          <div class="borrower-identity">
            <h2 class="borrower-name">${escapeHtml(borrower.borrower)}</h2>
            <p class="borrower-count">${active ? `当前借用 ${borrower.total_count} 件` : "当前无借用"}</p>
          </div>
          ${isAdmin() ? `<button class="borrower-delete" type="button" data-borrower-delete="${borrower.id}"
                  aria-label="删除借用人 ${escapeHtml(borrower.borrower)}"
                  title="${active ? `还有 ${borrower.total_count} 件在借，归还后可删除` : "删除借用人"}"
                  ${active ? "disabled" : ""}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.4 8h5.2l.4-8M7 7v3.2M9 7v3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>` : ""}
        </div>
        ${borrower.note ? `<p class="borrower-note">${escapeHtml(borrower.note)}</p>` : ""}
        ${items ? `<div class="borrower-items">${items}</div>` : `<p class="borrower-idle">所有器物均已归还</p>`}
        <div class="borrower-history">${historyLine}</div>
      </article>
    `;
  }).join("");

  renderBorrowerSuggestions();
}

function renderBorrowerSuggestions() {
  const names = new Set(state.borrowers.map((borrower) => borrower.borrower));
  els.borrowerSuggestions.innerHTML = Array.from(names)
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function highlightBorrower(name) {
  const card = $$(".borrower-card", els.borrowerGrid)
    .find((item) => item.dataset.borrower === name);
  if (!card) return;
  card.classList.add("is-highlighted");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => card.classList.remove("is-highlighted"), 2200);
}

function openBorrowerDialog() {
  els.borrowerForm.reset();
  els.borrowerNameError.textContent = "";
  els.borrowerName.classList.remove("is-invalid");
  els.borrowerDialog.showModal();
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    if (els.borrowerDialog.open) els.borrowerName.focus();
  }, 40);
}

async function submitBorrower(event) {
  event.preventDefault();
  const name = els.borrowerName.value.trim();
  if (!name) {
    els.borrowerNameError.textContent = "请填写借用人姓名";
    els.borrowerName.classList.add("is-invalid");
    els.borrowerName.focus();
    return;
  }
  els.borrowerSubmit.disabled = true;
  const original = els.borrowerSubmit.textContent;
  els.borrowerSubmit.textContent = "添加中…";
  try {
    await api("/api/borrowers", {
      method: "POST",
      body: { name, note: els.borrowerNote.value.trim() },
    });
    closeDialog(els.borrowerDialog);
    await refreshAllData({ preserveSelection: true });
    showToast(`已添加借用人「${name}」`);
  } catch (error) {
    els.borrowerNameError.textContent = error.message;
    els.borrowerName.classList.add("is-invalid");
  } finally {
    els.borrowerSubmit.disabled = false;
    els.borrowerSubmit.textContent = original;
  }
}

async function removeBorrower(borrowerId) {
  const borrower = state.borrowers.find((item) => item.id === borrowerId);
  if (!borrower) return;
  if (borrower.total_count > 0) {
    showToast("该借用人还有器物在借，请先归还");
    return;
  }
  const confirmed = await askConfirm(
    `删除借用人「${borrower.borrower}」？`,
    borrower.history_count
      ? `名录会被移除，但 ${borrower.history_count} 条历史流水仍会保留。`
      : "删除后，该借用人会从名录中移除。",
  );
  if (!confirmed) return;
  try {
    await api(`/api/borrowers/${borrowerId}`, { method: "DELETE" });
    await refreshAllData({ preserveSelection: true });
    showToast(`已删除借用人「${borrower.borrower}」`);
  } catch (error) {
    showToast(error.message);
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function flattenCategoryOptions(nodes, depth = 0) {
  const options = [];
  for (const node of nodes) {
    const prefix = depth ? `${"— ".repeat(depth)}` : "";
    options.push(
      `<option value="${node.id}">${prefix}${escapeHtml(node.name)}${node.children.length ? "（全部）" : ""}</option>`
    );
    if (node.children.length) options.push(...flattenCategoryOptions(node.children, depth + 1));
  }
  return options;
}

function populateFilterOptions() {
  const borrowerNames = new Set([
    ...state.historyAll.map((record) => record.borrower),
    ...state.borrowers.map((borrower) => borrower.borrower),
  ]);
  const currentBorrower = els.filterBorrower.value;
  const currentCategory = els.filterCategory.value;

  els.filterBorrower.innerHTML = `<option value="">全部借用人</option>` + Array.from(borrowerNames)
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");

  els.filterCategory.innerHTML = `<option value="">全部品类</option>${flattenCategoryOptions(state.categories).join("")}`;

  els.filterBorrower.value = borrowerNames.has(currentBorrower) ? currentBorrower : "";
  els.filterCategory.value = findCategory(Number(currentCategory)) ? currentCategory : "";
}

function readFilters() {
  return {
    borrower: els.filterBorrower.value,
    category_id: els.filterCategory.value,
    from: els.filterFrom.value,
    to: els.filterTo.value,
    q: els.filterSearch.value.trim(),
  };
}

function filtersActive(filters = readFilters()) {
  return Boolean(filters.borrower || filters.category_id || filters.from || filters.to || filters.q);
}

function syncDatePlaceholders() {
  $$(".date-input").forEach((wrapper) => {
    const input = wrapper.querySelector("input");
    wrapper.classList.toggle("has-value", Boolean(input?.value));
  });
}

function syncFilterChrome() {
  const filters = readFilters();
  const active = filtersActive(filters);
  els.filterReset.hidden = !active;
  els.searchClear.hidden = !filters.q;
  syncDatePlaceholders();
  if (filters.from) els.filterTo.min = filters.from;
  else els.filterTo.removeAttribute("min");
  if (filters.to) els.filterFrom.max = filters.to;
  else els.filterFrom.removeAttribute("max");
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const values = Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  values.forEach((page, index) => {
    if (index && page - values[index - 1] > 1) result.push("…");
    result.push(page);
  });
  return result;
}

function renderHistory() {
  const total = state.history.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPages);
  const start = (state.page - 1) * state.pageSize;
  const rows = state.history.slice(start, start + state.pageSize);

  els.archiveCount.textContent = `${total} 条记录`;
  els.historyTotal.textContent = total
    ? `共 ${total} 条 · 第 ${state.page} / ${totalPages} 页`
    : "共 0 条";

  if (!rows.length) {
    els.historyBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          <div class="table-empty-inner">
            <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1.3"/>
              <path d="m23.5 23.5 7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M12 16h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>
            </svg>
            <strong>没有匹配的历史记录</strong>
            <span>换一个借用人、品类或时间范围试试。</span>
          </div>
        </td>
      </tr>
    `;
  } else {
    els.historyBody.innerHTML = rows.map((record) => {
      const rented = record.status === "rented";
      return `
        <tr>
          <td class="cell-product" title="${escapeHtml(record.product_name)}">${escapeHtml(record.product_name)}</td>
          <td class="cell-muted">${escapeHtml(record.category)}</td>
          <td class="cell-borrower">${escapeHtml(record.borrower)}</td>
          <td class="cell-operator">${operatorCell(record)}</td>
          <td class="cell-muted">${formatDate(record.lend_date)}</td>
          <td class="cell-muted">${formatDate(record.return_date)}</td>
          <td><span class="status-badge${rented ? " is-rented" : ""}">${rented ? "出租中" : "已归还"}</span></td>
          <td class="history-action-cell">
            ${!isAdmin() ? "" : rented
              ? `<button class="history-delete" type="button" disabled
                         aria-label="进行中的借用不能删除" title="进行中的借用请先归还">
                   <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.4 8h5.2l.4-8M7 7v3.2M9 7v3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 </button>`
              : `<button class="history-delete" type="button" data-history-delete="${record.id}"
                         aria-label="删除 ${escapeHtml(record.product_name)} 的借用记录" title="删除记录">
                   <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.4 8h5.2l.4-8M7 7v3.2M9 7v3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 </button>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  if (totalPages > 1) {
    const pages = pageNumbers(state.page, totalPages);
    els.historyPagination.innerHTML = `
      <button class="page-button is-arrow" type="button" data-page="${state.page - 1}"
              aria-label="上一页" ${state.page === 1 ? "disabled" : ""}>‹</button>
      ${pages.map((page) => typeof page === "string"
        ? `<span class="page-ellipsis" aria-hidden="true">…</span>`
        : `<button class="page-button${page === state.page ? " is-active" : ""}" type="button"
                   data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`).join("")}
      <button class="page-button is-arrow" type="button" data-page="${state.page + 1}"
              aria-label="下一页" ${state.page === totalPages ? "disabled" : ""}>›</button>
    `;
  } else {
    els.historyPagination.innerHTML = "";
  }
}

async function fetchHistory({ fade = true, resetPage = true } = {}) {
  const filters = readFilters();
  if (filters.from && filters.to && filters.from > filters.to) {
    showToast("开始日期不能晚于结束日期");
    return;
  }
  if (filters.category_id && !findCategory(Number(filters.category_id))) {
    filters.category_id = "";
  }

  const requestId = ++state.historyRequest;
  if (fade) els.historyShell.classList.add("is-fading");
  if (resetPage) state.page = 1;

  try {
    const records = await api(`/api/history${updateQueryString(filters)}`);
    if (requestId !== state.historyRequest) return;
    state.history = Array.isArray(records) ? records : [];
    renderHistory();
  } catch (error) {
    if (requestId === state.historyRequest) showToast(error.message);
  } finally {
    if (requestId === state.historyRequest) {
      requestAnimationFrame(() => {
        window.setTimeout(() => els.historyShell.classList.remove("is-fading"), 30);
      });
    }
  }
}

function resetFilters() {
  els.filterBorrower.value = "";
  els.filterCategory.value = "";
  els.filterFrom.value = "";
  els.filterTo.value = "";
  els.filterSearch.value = "";
  syncFilterChrome();
  fetchHistory();
}

function populateHistoryProductOptions() {
  els.historyProduct.innerHTML = `<option value="">手动填写产品</option>` + state.products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} · ${escapeHtml(product.asset_code)}${product.status === "rented" ? "（出租中）" : ""}</option>`)
    .join("");
}

function syncHistoryProductFields() {
  const product = state.products.find((item) => item.id === Number(els.historyProduct.value));
  const manual = !product;
  els.historyProductName.disabled = !manual;
  els.historyCategory.disabled = !manual;
  els.historyProductName.value = product?.name || "";
  els.historyCategory.value = product?.category || "";
  els.historyProductName.placeholder = manual ? "如：云栖休闲椅" : "";
  els.historyProductError.textContent = "";
  els.historyProductName.classList.remove("is-invalid");
}

function openHistoryDialog() {
  els.historyForm.reset();
  populateHistoryProductOptions();
  els.historyLend.value = todayISO();
  els.historyReturn.value = todayISO();
  els.historyBorrower.value = "";
  els.historyProductError.textContent = "";
  els.historyBorrowerError.textContent = "";
  els.historyDateError.textContent = "";
  [els.historyProductName, els.historyBorrower, els.historyLend, els.historyReturn]
    .forEach((input) => input.classList.remove("is-invalid"));
  syncHistoryProductFields();
  els.historyDialog.showModal();
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    if (els.historyDialog.open) els.historyBorrower.focus();
  }, 40);
}

async function submitHistory(event) {
  event.preventDefault();
  const productId = els.historyProduct.value;
  const productName = els.historyProductName.value.trim();
  const category = els.historyCategory.value.trim();
  const borrower = els.historyBorrower.value.trim();
  const lendDate = els.historyLend.value;
  const returnDate = els.historyReturn.value;
  let valid = true;
  if (!productId && !productName) {
    els.historyProductError.textContent = "请选择产品或填写产品名称";
    els.historyProductName.classList.add("is-invalid");
    valid = false;
  }
  if (!borrower) {
    els.historyBorrowerError.textContent = "请填写借用人";
    els.historyBorrower.classList.add("is-invalid");
    valid = false;
  }
  if (!lendDate || !returnDate || returnDate < lendDate) {
    els.historyDateError.textContent = "归还日期不能早于出借日期";
    els.historyReturn.classList.add("is-invalid");
    valid = false;
  }
  if (!valid) return;

  els.historySubmit.disabled = true;
  const original = els.historySubmit.textContent;
  els.historySubmit.textContent = "保存中…";
  try {
    await api("/api/history", {
      method: "POST",
      body: {
        product_id: productId ? Number(productId) : null,
        product_name: productName,
        category,
        borrower,
        lend_date: lendDate,
        return_date: returnDate,
      },
    });
    closeDialog(els.historyDialog);
    await refreshAllData({ preserveSelection: true });
    showToast("已补录一条借用历史");
  } catch (error) {
    showToast(error.message);
  } finally {
    els.historySubmit.disabled = false;
    els.historySubmit.textContent = original;
  }
}

async function removeHistoryRecord(rentalId) {
  const record = state.history.find((item) => item.id === rentalId);
  if (!record) return;
  const confirmed = await askConfirm(
    "删除这条借用记录？",
    `「${record.product_name}」· ${record.borrower} · ${formatDate(record.lend_date)}。删除后不可恢复。`,
  );
  if (!confirmed) return;
  try {
    await api(`/api/history/${rentalId}`, { method: "DELETE" });
    await refreshAllData({ preserveSelection: true });
    showToast("借用记录已删除");
  } catch (error) {
    showToast(error.message);
  }
}

// ---------------------------------------------------------------------------
// Rent dialog
// ---------------------------------------------------------------------------

function buildRentGroups(preselectedId) {
  const groups = [];
  const indexByKey = new Map();
  for (const product of state.products) {
    if (product.status !== "in_stock") continue;
    const key = `${product.name}|${product.category_id}|${product.model_url}`;
    let group = indexByKey.get(key);
    if (!group) {
      group = {
        key,
        name: product.name,
        categoryPath: product.category_path,
        products: [],
        quantity: 0,
      };
      indexByKey.set(key, group);
      groups.push(group);
    }
    group.products.push(product);
  }
  if (preselectedId) {
    const selectedIndex = groups.findIndex((group) =>
      group.products.some((product) => product.id === preselectedId)
    );
    if (selectedIndex > 0) {
      const [selectedGroup] = groups.splice(selectedIndex, 1);
      selectedGroup.quantity = 1;
      groups.unshift(selectedGroup);
    } else if (selectedIndex === 0) {
      groups[0].quantity = 1;
    }
  }
  return groups;
}

function rentSelectedCount() {
  return state.rentGroups.reduce((sum, group) => sum + group.quantity, 0);
}

function updateRentSelectionUI() {
  const count = rentSelectedCount();
  els.rentSelectionCount.textContent = `已选 ${count} 件`;
  els.rentItemsError.textContent = "";
  $$(".rent-option", els.rentOptions).forEach((row) => {
    const group = state.rentGroups[Number(row.dataset.groupIndex)];
    row.classList.toggle("is-selected", group.quantity > 0);
    $(".stepper-value", row).textContent = group.quantity;
    $("[data-step='-1']", row).disabled = group.quantity <= 0;
    $("[data-step='1']", row).disabled = group.quantity >= group.products.length;
  });
}

function renderRentOptions() {
  if (!state.rentGroups.length) {
    els.rentOptions.innerHTML = `<div class="picker-empty">当前没有可借出的产品。</div>`;
    updateRentSelectionUI();
    return;
  }

  els.rentOptions.innerHTML = state.rentGroups.map((group, index) => `
    <div class="rent-option${group.quantity > 0 ? " is-selected" : ""}" data-group-index="${index}">
      <div class="rent-option-main">
        <div class="rent-option-name">${escapeHtml(group.name)}</div>
        <div class="rent-option-meta">${escapeHtml(group.categoryPath)} · 可借 ${group.products.length} 件</div>
      </div>
      <div class="stepper" aria-label="${escapeHtml(group.name)} 数量">
        <button type="button" data-step="-1" aria-label="减少一件" ${group.quantity <= 0 ? "disabled" : ""}>−</button>
        <span class="stepper-value">${group.quantity}</span>
        <button type="button" data-step="1" aria-label="增加一件" ${group.quantity >= group.products.length ? "disabled" : ""}>＋</button>
      </div>
    </div>
  `).join("");
  updateRentSelectionUI();
}

function openRentDialog({ productId = null, borrower = "" } = {}) {
  const product = productId
    ? state.products.find((item) => item.id === productId)
    : getSelectedProduct();
  if (!product) return;
  if (product.status !== "in_stock") {
    showToast("该产品已借出，只能归还；如需继续借用，请选择同类的在库产品");
    return;
  }
  state.dialogProductId = product.id;
  els.rentForm.reset();
  els.rentBorrower.value = borrower;
  els.rentDate.value = todayISO();
  els.rentBorrowerError.textContent = "";
  els.rentDateError.textContent = "";
  els.rentItemsError.textContent = "";
  els.rentBorrower.classList.remove("is-invalid");
  els.rentDate.classList.remove("is-invalid");
  state.rentGroups = buildRentGroups(product.id);
  els.rentProductName.textContent = `从「${product.name}」开始，可继续添加同款或其他器物。`;
  renderRentOptions();
  els.rentDialog.showModal();
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    if (els.rentDialog.open) els.rentBorrower.focus();
  }, 40);
}

async function submitRent(event) {
  event.preventDefault();
  const product = state.products.find((item) => item.id === state.dialogProductId);
  if (!product) return;

  const borrower = els.rentBorrower.value.trim();
  const lendDate = els.rentDate.value;
  const productIds = [];
  for (const group of state.rentGroups) {
    if (group.quantity > 0) {
      productIds.push(...group.products.slice(0, group.quantity).map((item) => item.id));
    }
  }

  els.rentBorrowerError.textContent = "";
  els.rentDateError.textContent = "";
  els.rentItemsError.textContent = "";
  els.rentBorrower.classList.remove("is-invalid");
  els.rentDate.classList.remove("is-invalid");

  let valid = true;
  if (!productIds.length) {
    els.rentItemsError.textContent = "请至少选择一件产品";
    valid = false;
  }
  if (!borrower) {
    els.rentBorrowerError.textContent = "请填写借用人姓名";
    els.rentBorrower.classList.add("is-invalid");
    valid = false;
  }
  if (!lendDate) {
    els.rentDateError.textContent = "请选择出借日期";
    els.rentDate.classList.add("is-invalid");
    valid = false;
  }
  if (!valid) return;

  const original = els.rentSubmit.textContent;
  els.rentSubmit.disabled = true;
  els.rentSubmit.textContent = "正在登记…";
  try {
    await api("/api/rentals/batch", {
      method: "POST",
      body: { borrower, lend_date: lendDate, product_ids: productIds },
    });
    closeDialog(els.rentDialog);
    showToast(`已借出 ${productIds.length} 件器物给 ${borrower}`);
    await refreshAllData();
    setView("products", { updateHash: true, smooth: false });
  } catch (error) {
    showToast(error.message);
  } finally {
    els.rentSubmit.disabled = false;
    els.rentSubmit.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Return dialog
// ---------------------------------------------------------------------------

function returnSelectedItems() {
  return state.returnItems.filter((item) => item.checked);
}

function latestLendDate(items) {
  return items.reduce((latest, item) => {
    const date = item.product.current_lend_date || "";
    return date > latest ? date : latest;
  }, "");
}

function updateReturnSelectionUI() {
  const selected = returnSelectedItems();
  els.returnSelectedCount.textContent = `${selected.length} 件`;
  els.returnItemsError.textContent = "";
  const latest = latestLendDate(selected.length ? selected : state.returnItems);
  if (latest) els.returnDate.min = latest;
  els.returnDateError.textContent = "";
}

function renderReturnOptions() {
  if (!state.returnItems.length) {
    els.returnOptions.innerHTML = `<div class="picker-empty">当前没有可归还的产品。</div>`;
    return;
  }

  els.returnOptions.innerHTML = state.returnItems.map((item) => `
    <label class="return-option${item.checked ? " is-selected" : ""}" data-rental-id="${item.product.active_rental_id}">
      <input class="return-checkbox" type="checkbox" ${item.checked ? "checked" : ""}
             data-rental-id="${item.product.active_rental_id}">
      <span class="return-check" aria-hidden="true">
        <svg viewBox="0 0 12 10" fill="none"><path d="m1 5 3.2 3L11 1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="return-option-main">
        <span class="return-option-name">${escapeHtml(item.product.name)}</span>
        <span class="return-option-meta">${escapeHtml(item.product.asset_code)} · ${escapeHtml(item.product.category_path)} · ${formatDate(item.product.current_lend_date)} 借出</span>
      </span>
    </label>
  `).join("");
  updateReturnSelectionUI();
}

function openReturnDialog() {
  const product = getSelectedProduct();
  if (!product || product.status !== "rented") return;
  if (!product.active_rental_id) {
    showToast("未找到进行中的借用记录，请刷新后重试");
    return;
  }
  state.dialogProductId = product.id;
  const borrower = product.current_borrower || "";
  const activeItems = state.products.filter((item) =>
    item.status === "rented" && item.current_borrower === borrower && item.active_rental_id
  );
  state.returnItems = activeItems.map((item) => ({
    product: item,
    checked: item.id === product.id,
  }));

  els.returnForm.reset();
  els.returnProductName.textContent = `${borrower} 当前共有 ${activeItems.length} 件在借，可一并归还。`;
  els.returnBorrower.textContent = borrower || "—";
  els.returnDate.value = todayISO();
  els.returnItemsError.textContent = "";
  els.returnDateError.textContent = "";
  els.returnDate.classList.remove("is-invalid");
  renderReturnOptions();
  els.returnDialog.showModal();
  document.body.classList.add("modal-open");
}

async function submitReturn(event) {
  event.preventDefault();
  const selected = returnSelectedItems();
  const returnDate = els.returnDate.value;
  els.returnItemsError.textContent = "";
  els.returnDateError.textContent = "";
  els.returnDate.classList.remove("is-invalid");

  let valid = true;
  if (!selected.length) {
    els.returnItemsError.textContent = "请至少选择一件要归还的产品";
    valid = false;
  }
  if (!returnDate) {
    els.returnDateError.textContent = "请选择归还日期";
    els.returnDate.classList.add("is-invalid");
    valid = false;
  }
  const latest = latestLendDate(selected);
  if (returnDate && latest && returnDate < latest) {
    els.returnDateError.textContent = "归还日期不能早于出借日期";
    els.returnDate.classList.add("is-invalid");
    valid = false;
  }
  if (!valid) return;

  const original = els.returnSubmit.textContent;
  els.returnSubmit.disabled = true;
  els.returnSubmit.textContent = "正在归还…";
  try {
    await api("/api/rentals/return-batch", {
      method: "POST",
      body: {
        return_date: returnDate,
        rental_ids: selected.map((item) => item.product.active_rental_id),
      },
    });
    closeDialog(els.returnDialog);
    showToast(`已归还 ${selected.length} 件器物`);
    await refreshAllData();
    setView("products", { updateHash: true, smooth: false });
  } catch (error) {
    showToast(error.message);
  } finally {
    els.returnSubmit.disabled = false;
    els.returnSubmit.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Model studio
// ---------------------------------------------------------------------------

function hashText(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function inferModelFromName(rawName) {
  const name = String(rawName || "").trim();
  const text = name.toLowerCase();
  let modelKey = "generated";

  if (/耳夹|ear.?clip/.test(text)) modelKey = "ear-clip";
  else if (/挂耳|ear.?hook/.test(text)) modelKey = "ear-hook";
  else if (/骨传导|bone.?conduct/.test(text)) modelKey = "bone-conduction";
  else if (/游戏.*耳机|头戴.*游戏|gaming.?head/.test(text)) modelKey = "gaming-headphones";
  else if (/降噪.*耳机|anc|noise.?cancel/.test(text)) modelKey = "anc-headphones";
  else if (/有线.*耳机|iem|wire.?ear/.test(text)) modelKey = "wired-earbuds";
  else if (/耳机|耳麦|headphone|earbud|buds/.test(text)) modelKey = "wireless-earbuds";
  else if (/键盘|keyboard/.test(text)) modelKey = "keyboard";
  else if (/鼠标垫|mouse.?pad/.test(text)) modelKey = "mousepad";
  else if (/鼠标|mouse/.test(text)) modelKey = "mouse";
  else if (/显示器支架|monitor.?arm/.test(text)) modelKey = "monitor-arm";
  else if (/显示器|屏幕|monitor|screen/.test(text)) modelKey = "monitor";
  else if (/电视|tv/.test(text)) modelKey = "tv";
  else if (/投影|projector/.test(text)) modelKey = "projector";
  else if (/充电宝|移动电源|power.?bank/.test(text)) modelKey = "power-bank";
  else if (/充电头|充电器|氮化镓|charger/.test(text)) modelKey = "charger";
  else if (/散热|cooler/.test(text)) modelKey = "phone-cooler";
  else if (/手柄|controller|gamepad/.test(text)) modelKey = "controller";
  else if (/硬盘|ssd|storage/.test(text)) modelKey = "ssd";
  else if (/笔记本|laptop|notebook|电脑/.test(text)) modelKey = "laptop";
  else if (/平板|tablet|ipad/.test(text)) modelKey = "tablet";
  else if (/手机|phone|mobile/.test(text)) modelKey = "phone";
  else if (/扫地机|扫地机器人|robot.?vac/.test(text)) modelKey = "robot-vacuum";
  else if (/洗地机|吸尘器|vacuum/.test(text)) modelKey = "vacuum";
  else if (/冰箱|fridge|refrigerator/.test(text)) modelKey = "fridge";
  else if (/空调|air.?condition/.test(text)) modelKey = "air-conditioner";
  else if (/牙刷|toothbrush/.test(text)) modelKey = "toothbrush";
  else if (/刮胡刀|剃须刀|shaver/.test(text)) modelKey = "shaver";
  else if (/血压|blood.?pressure/.test(text)) modelKey = "blood-pressure";
  else if (/助听|hearing.?aid/.test(text)) modelKey = "hearing-aid";
  else if (/按摩椅|massage.?chair/.test(text)) modelKey = "massage-chair";
  else if (/按摩|massag/.test(text)) modelKey = "massager";
  else if (/跑步机|treadmill/.test(text)) modelKey = "treadmill";
  else if (/升降桌|standing.?desk/.test(text)) modelKey = "standing-desk";
  else if (/行李箱|luggage|suitcase/.test(text)) modelKey = "luggage";
  else if (/服装|衣服|服饰|clothing|apparel/.test(text)) modelKey = "clothing";
  else if (/保温杯|水杯|杯子|cup|mug/.test(text)) modelKey = "cup";
  else if (/路由器|router/.test(text)) modelKey = "router";
  else if (/沙发|双人|loveseat|sofa/.test(text)) modelKey = "loveseat";
  else if (/凳|stool/.test(text)) modelKey = "stool";
  else if (/餐椅|dining.?chair/.test(text)) modelKey = "dining-chair";
  else if (/躺椅|休闲椅|lounge.?chair/.test(text)) modelKey = "lounge-chair";
  else if (/椅|座|chair/.test(text)) modelKey = "office-chair";
  else if (/落地灯|floor.?lamp/.test(text)) modelKey = "floor-lamp";
  else if (/灯|lamp|light/.test(text)) modelKey = "table-lamp";
  else if (/边几|side.?table/.test(text)) modelKey = "side-table";
  else if (/桌|几|台面|table|desk/.test(text)) modelKey = "coffee-table";
  else if (/柜|架|收纳|cabinet|shelf/.test(text)) modelKey = "cabinet";
  else if (/床|bed/.test(text)) modelKey = "bed";
  else if (/花瓶|花器|壶|瓶|vase|pot/.test(text)) modelKey = "vessel";
  else if (/植物|绿植|花艺|plant|花/.test(text)) modelKey = "plant";
  else if (/咖啡机|净化器|风扇|饮水|电器|appliance|machine/.test(text)) modelKey = "appliance";
  else if (/相机|镜头|camera|lens/.test(text)) modelKey = "camera";
  else if (/唱机|黑胶|turntable|record/.test(text)) modelKey = "turntable";
  else if (/音箱|音响|喇叭|speaker|sound/.test(text)) modelKey = "speaker";

  const hash = hashText(name || "新品类");
  const finishes = ["oak", "sage", "clay", "graphite", "default"];
  const finish = finishes[hash % finishes.length];
  const scale = {
    x: 0.97 + ((hash >> 3) % 7) / 100,
    y: 0.98 + ((hash >> 6) % 5) / 100,
    z: 0.97 + ((hash >> 9) % 7) / 100,
  };
  const option = MODEL_OPTIONS.find(([key]) => key === modelKey);
  return {
    modelKey,
    label: option ? option[1] : "生成模型",
    finish,
    scale,
    seed: (hash % 2_147_483_646) + 1,
  };
}

function buildDraftModelUrl(draft) {
  const params = new URLSearchParams();
  const { x, y, z } = draft.scale;
  if (Math.abs(x - 1) > 0.0001 || Math.abs(y - 1) > 0.0001 || Math.abs(z - 1) > 0.0001) {
    params.set("sx", Number(x.toFixed(3)));
    params.set("sy", Number(y.toFixed(3)));
    params.set("sz", Number(z.toFixed(3)));
  }
  if (draft.finish !== "default") params.set("finish", draft.finish);
  if (draft.modelKey === "generated") params.set("seed", String(draft.seed || 1));
  const query = params.toString();
  const custom = customModel(draft.modelKey);
  const base = custom ? custom.url : `/assets/models/${draft.modelKey}.glb`;
  return `${base}${query ? `?${query}` : ""}`;
}

function modelScopeCounts(product) {
  return {
    current: 1,
    same_name: state.products.filter((item) =>
      item.name === product.name && item.category_id === product.category_id
    ).length,
    category: state.products.filter((item) => item.category_id === product.category_id).length,
  };
}

function renderModelStyles() {
  const draft = state.modelDraft;
  els.modelStyleGrid.innerHTML = baseGridOptions().map(([key, label]) => `
    <button class="model-style-button${draft.modelKey === key ? " is-selected" : ""}"
            type="button" data-model-key="${key}" aria-pressed="${draft.modelKey === key}">
      ${THUMBNAILS[key] || THUMBNAILS["lounge-chair"]}
      <span class="model-style-label">${label}</span>
    </button>
  `).join("");
  renderCustomModelGrid();
  const selected = allModelOptions().find(([key]) => key === draft.modelKey);
  els.modelShapeName.textContent = selected ? selected[1] : draft.modelKey;
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderCustomModelGrid() {
  const draft = state.modelDraft;
  if (!state.customModels.length) {
    els.modelCustomGrid.innerHTML = `<div class="model-custom-empty">还没有导入外部模型。点击右上角「管理模型库」上传 GLB。</div>`;
    return;
  }
  els.modelCustomGrid.innerHTML = state.customModels.map((model) => {
    const selected = draft.modelKey === model.key;
    return `
      <button class="model-custom-card${selected ? " is-selected" : ""}" type="button"
              data-custom-model-key="${model.key}" aria-pressed="${selected}">
        <span class="model-custom-icon">${THUMBNAILS["generated"]}</span>
        <span class="model-custom-info">
          <strong>${escapeHtml(model.name)}</strong>
          <small>外部 GLB · ${formatBytes(model.size_bytes)}</small>
        </span>
      </button>
    `;
  }).join("");
}

function renderPrototypeList() {
  const query = els.prototypeSearch.value.trim().toLowerCase();
  const visible = PROTOTYPE_MODELS.filter((item) => !item.key || !state.hiddenModels.has(item.key));
  const items = visible.filter((item) => {
    if (!query) return true;
    return `${item.code} ${item.name} ${item.category}`.toLowerCase().includes(query);
  });
  const clickable = visible.filter((item) => item.key).length;
  els.prototypeCount.textContent = `${clickable} 个可生成 · 1 个服务类`;
  if (!items.length) {
    els.prototypeList.innerHTML = `<div class="prototype-empty">没有匹配的产品原型。</div>`;
    return;
  }
  els.prototypeList.innerHTML = items.map((item) => {
    if (!item.key) {
      return `
        <div class="prototype-row is-disabled">
          <span class="prototype-code">${item.code}</span>
          <span class="prototype-info"><strong>${item.name}</strong><small>${item.category}</small></span>
          <span class="prototype-use">无实体</span>
        </div>
      `;
    }
    const selected = state.modelDraft.modelKey === item.key ? " is-selected" : "";
    return `
      <button class="prototype-row${selected}" type="button" data-prototype-key="${item.key}" aria-pressed="${state.modelDraft.modelKey === item.key}">
        <span class="prototype-code">${item.code}</span>
        <span class="prototype-info"><strong>${item.name}</strong><small>${item.category}</small></span>
        <span class="prototype-use">${selected ? "已选" : "使用"}</span>
      </button>
    `;
  }).join("");
}

function applyModelLibrary(payload) {
  state.modelLibrary = payload || { builtin: [], custom: [], hidden: [] };
  state.customModels = Array.isArray(payload?.custom) ? payload.custom : [];
  state.hiddenModels = new Set(Array.isArray(payload?.hidden) ? payload.hidden : []);
  state.modelUsage = new Map();
  for (const item of payload?.builtin || []) {
    state.modelUsage.set(item.key, item.usage_count || 0);
  }
  for (const item of state.customModels) {
    state.modelUsage.set(item.key, item.usage_count || 0);
  }
  if (els.adminProductModel) {
    els.adminProductModel.innerHTML = buildModelOptions(
      els.adminProductModel.value || "lounge-chair"
    );
  }
}

async function fetchModelLibrary() {
  const payload = await api("/api/models");
  applyModelLibrary(payload);
  return payload;
}

function modelLabel(key) {
  return MODEL_LABELS.get(key) || customModel(key)?.name || key;
}

function renderModelLibrary() {
  els.modelLibraryTabs.querySelectorAll("[data-library-tab]").forEach((button) => {
    const active = button.dataset.libraryTab === state.modelLibraryTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const usage = (key) => state.modelUsage.get(key) || 0;
  const rows = [];

  if (state.modelLibraryTab === "custom") {
    for (const model of state.customModels) {
      const used = usage(model.key);
      rows.push(`
        <div class="model-library-row">
          <div class="model-library-row-info">
            <strong>${escapeHtml(model.name)}</strong>
            <small>GLB · ${formatBytes(model.size_bytes)}${model.created_at ? ` · ${formatDate(model.created_at.slice(0, 10))}` : ""}</small>
          </div>
          <span class="model-library-usage">${used ? `${used} 件在用` : "未使用"}</span>
          <div class="model-library-row-actions">
            <button class="model-library-action" type="button" data-model-use="${model.key}">使用</button>
            <button class="model-library-action is-danger" type="button" data-model-delete-custom="${model.id}"
                    ${used ? "disabled" : ""} title="${used ? "仍有产品使用，不能删除" : "删除外部模型"}">删除</button>
          </div>
        </div>
      `);
    }
    if (!rows.length) {
      rows.push(`<div class="model-library-empty">还没有外部模型。选择 GLB 文件导入，单个文件不超过 15 MB。</div>`);
    }
  } else if (state.modelLibraryTab === "builtin") {
    const items = (state.modelLibrary?.builtin || [])
      .filter((item) => !state.hiddenModels.has(item.key))
      .sort((a, b) => modelLabel(a.key).localeCompare(modelLabel(b.key), "zh-CN"));
    for (const item of items) {
      const used = usage(item.key);
      rows.push(`
        <div class="model-library-row">
          <div class="model-library-row-info">
            <strong>${escapeHtml(modelLabel(item.key))}</strong>
            <small>${escapeHtml(item.key)}.glb</small>
          </div>
          <span class="model-library-usage">${used ? `${used} 件在用` : "未使用"}</span>
          <div class="model-library-row-actions">
            <button class="model-library-action" type="button" data-model-use="${item.key}">使用</button>
            <button class="model-library-action is-danger" type="button" data-model-hide="${item.key}"
                    ${used ? "disabled" : ""} title="${used ? "仍有产品使用，不能移除" : "从模型库移除"}">移除</button>
          </div>
        </div>
      `);
    }
    if (!rows.length) {
      rows.push(`<div class="model-library-empty">内置模型已全部移除。</div>`);
    }
  } else {
    const hidden = (state.modelLibrary?.builtin || []).filter((item) => state.hiddenModels.has(item.key));
    for (const item of hidden) {
      rows.push(`
        <div class="model-library-row">
          <div class="model-library-row-info">
            <strong>${escapeHtml(modelLabel(item.key))}</strong>
            <small>${escapeHtml(item.key)}.glb · 已从模型库移除</small>
          </div>
          <span class="model-library-usage">可恢复</span>
          <div class="model-library-row-actions">
            <button class="model-library-action" type="button" data-model-restore="${item.key}">恢复</button>
          </div>
        </div>
      `);
    }
    if (!rows.length) {
      rows.push(`<div class="model-library-empty">没有已移除的内置模型。</div>`);
    }
  }

  els.modelLibraryList.innerHTML = rows.join("");
}

function openModelLibrary() {
  if (!state.modelOpen || !state.modelDraft) return;
  state.modelLibraryTab = "custom";
  els.modelImportForm.reset();
  els.modelImportFilename.textContent = "未选择文件";
  els.modelImportError.textContent = "";
  els.modelImportName.value = "";
  renderModelLibrary();
  els.modelLibraryDialog.showModal();
  document.body.classList.add("modal-open");
}

async function submitModelImport(event) {
  event.preventDefault();
  const file = els.modelImportFile.files?.[0];
  const error = (message) => {
    els.modelImportError.textContent = message;
  };
  if (!file) {
    error("请选择一个 .glb 文件");
    return;
  }
  if (!/\.glb$/i.test(file.name)) {
    error("目前只支持 .glb 格式");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    error("模型文件不能超过 15 MB");
    return;
  }
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  }).catch((readError) => {
    error(readError.message);
    return "";
  });
  if (!data) return;

  els.modelImportSubmit.disabled = true;
  const original = els.modelImportSubmit.textContent;
  els.modelImportSubmit.textContent = "导入中…";
  try {
    const imported = await api("/api/models/import", {
      method: "POST",
      body: {
        name: els.modelImportName.value.trim(),
        filename: file.name,
        data,
      },
    });
    await fetchModelLibrary();
    state.modelDraft.modelKey = imported.key;
    state.modelDraft.seed = 1;
    state.modelDraft.finish = "default";
    renderModelStudio();
    previewModelDraft();
    closeDialog(els.modelLibraryDialog);
    showToast(`已导入模型「${imported.name}」`);
  } catch (importError) {
    error(importError.message);
  } finally {
    els.modelImportSubmit.disabled = false;
    els.modelImportSubmit.textContent = original;
  }
}

function useModelFromLibrary(key) {
  if (!state.modelDraft || !allModelOptions().some(([value]) => value === key)) return;
  state.modelDraft.modelKey = key;
  state.modelDraft.seed = 1;
  if (isCustomModel(key)) state.modelDraft.finish = "default";
  renderModelStudio();
  previewModelDraft();
  closeDialog(els.modelLibraryDialog);
}

async function hideBuiltinModel(key) {
  const name = modelLabel(key);
  const confirmed = await askConfirm(
    `从模型库移除「${name}」？`,
    "内置几何仍然保留；如果之后需要，可以在「已移除」中恢复。",
  );
  if (!confirmed) return;
  try {
    await api("/api/models/hide", { method: "POST", body: { key } });
    await fetchModelLibrary();
    let changed = false;
    if (state.modelDraft?.modelKey === key) {
      state.modelDraft.modelKey = "lounge-chair";
      changed = true;
    }
    renderModelStudio();
    if (changed) previewModelDraft();
    renderModelLibrary();
    showToast(`已移除「${name}」`);
  } catch (error) {
    showToast(error.message);
  }
}

async function restoreBuiltinModel(key) {
  try {
    await api("/api/models/restore", { method: "POST", body: { key } });
    await fetchModelLibrary();
    renderModelStudio();
    renderModelLibrary();
    showToast(`已恢复「${modelLabel(key)}」`);
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCustomModel(modelId) {
  const model = state.customModels.find((item) => item.id === modelId);
  if (!model) return;
  const confirmed = await askConfirm(
    `删除外部模型「${model.name}」？`,
    "文件会从服务器移除；仍被产品使用时无法删除。",
  );
  if (!confirmed) return;
  try {
    await api(`/api/models/custom/${modelId}`, { method: "DELETE" });
    await fetchModelLibrary();
    let changed = false;
    if (state.modelDraft?.modelKey === model.key) {
      state.modelDraft.modelKey = "lounge-chair";
      changed = true;
    }
    renderModelStudio();
    if (changed) previewModelDraft();
    renderModelLibrary();
    showToast(`已删除「${model.name}」`);
  } catch (error) {
    showToast(error.message);
  }
}

function renderModelFinishes() {
  const draft = state.modelDraft;
  const custom = isCustomModel(draft.modelKey);
  els.modelFinishNote.hidden = !custom;
  els.modelFinishOptions.innerHTML = FINISH_OPTIONS.map(([key, label, color]) => `
    <button class="finish-option${draft.finish === key ? " is-selected" : ""}" type="button"
            data-finish="${key}" aria-pressed="${draft.finish === key}" ${custom ? "disabled" : ""}>
      <span class="finish-dot" style="background:${color}"></span>${label}
    </button>
  `).join("");
}

function renderModelScopes() {
  const product = getSelectedProduct();
  if (!product) return;
  const counts = modelScopeCounts(product);
  const options = [
    ["current", "仅当前一件", counts.current],
    ["same_name", "同名同款全部", counts.same_name],
    ["category", "该小类全部", counts.category],
  ];
  els.modelScopeOptions.innerHTML = options.map(([key, label, count]) => `
    <button class="scope-option${state.modelDraft.scope === key ? " is-selected" : ""}" type="button"
            data-scope="${key}" aria-pressed="${state.modelDraft.scope === key}">
      <span class="scope-dot" aria-hidden="true"></span>
      <span class="scope-label">${label}</span>
      <span class="scope-count">${count} 件</span>
    </button>
  `).join("");
}

function syncScaleControls() {
  const { scale } = state.modelDraft;
  const values = { x: scale.x, y: scale.y, z: scale.z };
  const inputs = { x: els.modelScaleX, y: els.modelScaleY, z: els.modelScaleZ };
  const outputs = { x: els.modelScaleXValue, y: els.modelScaleYValue, z: els.modelScaleZValue };
  for (const axis of ["x", "y", "z"]) {
    const percent = Math.round(values[axis] * 100);
    inputs[axis].value = String(percent);
    outputs[axis].textContent = `${percent}%`;
  }
}

function renderModelStudio() {
  const product = getSelectedProduct();
  if (!product || !state.modelDraft) return;
  if (!allModelOptions().some(([key]) => key === state.modelDraft.modelKey)) {
    state.modelDraft.modelKey = "lounge-chair";
  }
  els.modelContext.textContent = `${product.name} · ${product.category_path} · ${product.asset_code}`;
  renderModelStyles();
  renderPrototypeList();
  renderModelFinishes();
  renderModelScopes();
  syncScaleControls();
}

function previewModelDraft() {
  const product = getSelectedProduct();
  if (!product || !state.modelDraft) return;
  state.viewer?.setProduct({
    ...product,
    model_url: buildDraftModelUrl(state.modelDraft),
  });
}

function openModelStudio() {
  const product = getSelectedProduct();
  if (!product) return;
  if (state.adminOpen) closeAdmin();
  if (state.modelOpen) return;

  const parsed = parseModelUrl(product.model_url);
  state.modelOriginalProduct = product;
  state.modelDraft = {
    modelKey: parsed.key,
    scale: { ...parsed.scale },
    finish: parsed.finish,
    seed: parsed.seed,
    scope: "current",
  };
  els.modelGeneratedHint.hidden = true;
  els.prototypeSearch.value = "";

  renderModelStudio();
  state.modelOpen = true;
  window.clearTimeout(state.modelHideTimer);
  els.modelDrawer.hidden = false;
  window.requestAnimationFrame(() => els.modelDrawer.classList.add("is-open"));
  document.body.classList.add("model-open");
  previewModelDraft();
}

function closeModelStudio({ restore = true } = {}) {
  if (!state.modelOpen) return;
  state.modelOpen = false;
  if (restore && state.modelOriginalProduct) {
    state.viewer?.setProduct(state.modelOriginalProduct);
  }
  els.modelDrawer.classList.remove("is-open");
  document.body.classList.remove("model-open");
  state.modelHideTimer = window.setTimeout(() => {
    if (!state.modelOpen) els.modelDrawer.hidden = true;
  }, 320);
  state.modelDraft = null;
  state.modelOriginalProduct = null;
}

async function applyModelStudio() {
  const product = getSelectedProduct();
  if (!product || !state.modelDraft) return;
  const draft = state.modelDraft;
  const original = els.modelApply.textContent;
  els.modelApply.disabled = true;
  els.modelApply.textContent = "保存中…";
  try {
    const result = await api(`/api/products/${product.id}/model`, {
      method: "PATCH",
      body: {
        model_key: draft.modelKey,
        scale_x: draft.scale.x,
        scale_y: draft.scale.y,
        scale_z: draft.scale.z,
        finish: draft.finish,
        seed: draft.seed,
        scope: draft.scope,
      },
    });
    closeModelStudio({ restore: false });
    await refreshAllData({ preserveSelection: true });
    showToast(`已更新 ${result.updated} 件产品的 3D 模型`);
  } catch (error) {
    showToast(error.message);
  } finally {
    els.modelApply.disabled = false;
    els.modelApply.textContent = original;
  }
}

function openGenerateDialog() {
  if (!state.modelOpen) return;
  els.generateForm.reset();
  els.generateError.textContent = "";
  els.generateName.classList.remove("is-invalid");
  els.generateDialog.showModal();
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    if (els.generateDialog.open) els.generateName.focus();
  }, 40);
}

function submitGenerate(event) {
  event.preventDefault();
  const name = els.generateName.value.trim();
  if (!name) {
    els.generateError.textContent = "请填写品类或产品名称";
    els.generateName.classList.add("is-invalid");
    els.generateName.focus();
    return;
  }
  const inferred = inferModelFromName(name);
  state.modelDraft.modelKey = inferred.modelKey;
  state.modelDraft.finish = inferred.finish;
  state.modelDraft.scale = { ...inferred.scale };
  state.modelDraft.seed = inferred.seed;
  renderModelStudio();
  els.modelGeneratedHint.textContent = `已根据「${name}」生成：${inferred.label} · 可继续调整比例与材质`;
  els.modelGeneratedHint.hidden = false;
  previewModelDraft();
  closeDialog(els.generateDialog);
  showToast(`已生成「${inferred.label}」模型`);
}

// ---------------------------------------------------------------------------
// Admin drawer
// ---------------------------------------------------------------------------

function populateAdminSelects() {
  const parentValue = els.categoryParent.value;
  const parentOptions = flattenCategories()
    .filter((category) => category.depth < 4)
    .map((category) =>
      `<option value="${category.id}">${"— ".repeat(category.depth - 1)}${escapeHtml(categoryPath(category))}</option>`
    ).join("");
  els.categoryParent.innerHTML = `<option value="">作为一级大类</option>${parentOptions}`;
  if (Array.from(els.categoryParent.options).some((option) => option.value === parentValue)) {
    els.categoryParent.value = parentValue;
  }

  const productValue = els.adminProductCategory.value;
  const leafOptions = flattenCategories()
    .filter((category) => !category.children.length)
    .map((category) => `<option value="${category.id}">${escapeHtml(categoryPath(category))}</option>`)
    .join("");
  els.adminProductCategory.innerHTML = leafOptions;
  if (Array.from(els.adminProductCategory.options).some((option) => option.value === productValue)) {
    els.adminProductCategory.value = productValue;
  }
}

function categoryTreeRow(category, depth) {
  const editing = state.editingCategoryId === category.id;
  const tag = ["一级", "二级", "三级", "四级"][depth - 1] || `${depth}级`;
  const folded = isCategoryFolded(category);
  const hasDetail = categoryHasDetail(category);
  const caret = hasDetail
    ? `<button class="tree-caret${folded ? " is-folded" : ""}" type="button" data-category-toggle="${category.id}"
              aria-expanded="${!folded}" aria-label="${folded ? "展开" : "收回"} ${escapeHtml(category.name)} 的下一级">
        <svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="m3.2 1.8 3.4 3.2-3.4 3.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>`
    : `<span class="tree-caret-spacer" aria-hidden="true"></span>`;
  const addChild = depth < 4
    ? `<button class="tree-action" type="button" data-category-action="add-child"
              data-id="${category.id}" aria-label="在 ${escapeHtml(category.name)} 下添加子级">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>`
    : "";
  const nameBlock = editing
    ? `<div class="tree-edit-row">
         <input class="tree-edit-input" data-edit-input="${category.id}" value="${escapeHtml(category.name)}">
         <button class="tree-edit-save" type="button" data-category-action="save" data-id="${category.id}">保存</button>
         <button class="tree-edit-cancel" type="button" data-category-action="cancel" data-id="${category.id}">取消</button>
       </div>`
    : `<span class="tree-name">${escapeHtml(category.name)}</span>`;

  // 成员也能新建品类，但改名/删除仍只给管理员。
  const manageActions = isAdmin()
    ? `<button class="tree-action" type="button" data-category-action="edit" data-id="${category.id}" aria-label="重命名 ${escapeHtml(category.name)}">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 12.8h2.3L13 5.1 10.9 3 3.3 10.6 3 12.8Z" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"/></svg>
          </button>
          <button class="tree-action is-danger" type="button" data-category-action="delete" data-id="${category.id}" aria-label="删除 ${escapeHtml(category.name)}">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.4 8h5.2l.4-8M7 7v3.2M9 7v3.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>`
    : "";

  return `
    <div class="tree-row${depth > 1 ? " tree-child-row" : ""} tree-depth-${depth}" data-category-id="${category.id}">
      ${caret}
      <span class="tree-tag">${tag}</span>
      ${nameBlock}
      <span class="tree-stat">${category.product_count} 件 · ${category.borrowed_count} 借出</span>
      ${editing ? "" : `
        <div class="tree-actions">
          ${addChild}
          ${manageActions}
        </div>
      `}
    </div>
  `;
}

function categoryProducts(categoryId) {
  const groups = new Map();
  for (const product of state.products) {
    if (product.category_id !== categoryId) continue;
    const group = groups.get(product.name) || { name: product.name, count: 0, rented: 0 };
    group.count += 1;
    if (product.status === "rented") group.rented += 1;
    groups.set(product.name, group);
  }
  return Array.from(groups.values()).sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
}

function categoryHasDetail(category) {
  return category.children.length > 0 || categoryProducts(category.id).length > 0;
}

function isCategoryFolded(category) {
  return state.adminFoldedCategoryIds.has(category.id);
}

function unfoldCategoryPath(categoryId) {
  let category = findCategory(categoryId);
  while (category) {
    state.adminFoldedCategoryIds.delete(category.id);
    category = category.parent_id ? findCategory(category.parent_id) : null;
  }
}

function categoryProductList(category) {
  if (isCategoryFolded(category)) return "";
  const groups = categoryProducts(category.id);
  if (!groups.length) return "";
  const chips = groups.map((group) => {
    const hint = `${group.name} · ${group.count} 件${group.rented ? ` · ${group.rented} 件在借` : ""}`;
    return `
      <span class="tree-product${group.rented ? " is-rented" : ""}" title="${escapeHtml(hint)}">
        <span class="tree-product-name">${escapeHtml(group.name)}</span>
        <span class="tree-product-count">×${group.count}</span>
        ${group.rented ? `<span class="tree-product-rented">借出 ${group.rented}</span>` : ""}
      </span>
    `;
  }).join("");
  return `<div class="tree-products" aria-label="${escapeHtml(category.name)} 下的器物">${chips}</div>`;
}

function renderTreeBranch(category, depth) {
  const folded = isCategoryFolded(category);
  const children = !folded && category.children.length
    ? `<div class="tree-children">${category.children
        .map((child) => renderTreeBranch(child, depth + 1))
        .join("")}</div>`
    : "";
  return `
    <div class="tree-branch">
      ${categoryTreeRow(category, depth)}
      ${categoryProductList(category)}
      ${children}
    </div>
  `;
}

function renderCategoryTree() {
  if (!state.categories.length) {
    els.categoryTree.innerHTML = `<div class="tree-empty">还没有品类，请先添加一级大类。</div>`;
    return;
  }
  els.categoryTree.innerHTML = state.categories.map((root) => {
    const folded = isCategoryFolded(root);
    return `
    <div class="tree-root">
      ${categoryTreeRow(root, 1)}
      ${categoryProductList(root)}
      ${!folded && root.children.length
        ? `<div class="tree-children">${root.children
            .map((child) => renderTreeBranch(child, 2))
            .join("")}</div>`
        : ""}
    </div>
  `;
  }).join("");

  if (state.editingCategoryId) {
    window.requestAnimationFrame(() => {
      const input = $(`[data-edit-input="${state.editingCategoryId}"]`, els.categoryTree);
      if (input) {
        input.focus();
        input.select();
      }
    });
  }
}

function adminCategoryCount() {
  const all = flattenCategories();
  return `${state.categories.length} 个一级 · ${all.length} 个节点`;
}

function adminToggleAllFolded() {
  const detailNodes = flattenCategories().filter((category) => categoryHasDetail(category));
  const anyExpanded = detailNodes.some((category) => !state.adminFoldedCategoryIds.has(category.id));
  if (anyExpanded) {
    detailNodes.forEach((category) => state.adminFoldedCategoryIds.add(category.id));
  } else {
    state.adminFoldedCategoryIds.clear();
  }
}

function renderAdmin() {
  els.adminCategoryCount.textContent = adminCategoryCount();
  const detailNodes = flattenCategories().filter((category) => categoryHasDetail(category));
  const anyExpanded = detailNodes.some((category) => !state.adminFoldedCategoryIds.has(category.id));
  els.adminTreeToggle.setAttribute("aria-expanded", String(anyExpanded));
  els.adminTreeToggle.classList.toggle("is-collapsed", !anyExpanded);
  els.adminTreeToggleLabel.textContent = anyExpanded ? "全部收回" : "全部展开";
  populateAdminSelects();
  renderCategoryTree();
}

function currentAddCategoryId() {
  const product = getSelectedProduct();
  if (product?.category_id) return product.category_id;
  const active = state.activeCategoryId ? findCategory(state.activeCategoryId) : null;
  if (!active) return null;
  if (!active.children.length) return active.id;
  const leaf = flattenCategories().find(
    (category) => !category.children.length && categoryContains(active, category.id)
  );
  return leaf?.id ?? null;
}

function preferredModelForAdd(categoryId) {
  const product = getSelectedProduct();
  if (product?.category_id === categoryId) {
    const key = parseModelUrl(product.model_url).key;
    if (allModelOptions().some(([value]) => value === key)) return key;
  }
  return suggestModelForCategory(categoryId);
}

function prefillAddProductForm(categoryId) {
  if (!categoryId) return;
  const value = String(categoryId);
  const exists = Array.from(els.adminProductCategory.options).some(
    (option) => option.value === value
  );
  if (!exists) return;
  els.adminProductCategory.value = value;
  const modelKey = preferredModelForAdd(categoryId);
  if (modelKey) els.adminProductModel.value = modelKey;
}

function openAdmin(focus = "category") {
  if (state.modelOpen) closeModelStudio();
  const alreadyOpen = state.adminOpen;
  if (!alreadyOpen) {
    state.adminOpen = true;
    state.editingCategoryId = null;
    window.clearTimeout(state.adminHideTimer);
    els.adminBackdrop.hidden = false;
    els.adminDrawer.hidden = false;
    window.requestAnimationFrame(() => {
      els.adminBackdrop.classList.add("is-open");
      els.adminDrawer.classList.add("is-open");
    });
    document.body.classList.add("admin-open");
  }
  renderAdmin();
  prefillAddProductForm(currentAddCategoryId());
  window.setTimeout(() => {
    if (!state.adminOpen) return;
    if (focus === "product") {
      els.adminProductSection?.scrollIntoView({ block: "start", behavior: "smooth" });
      els.adminProductName.focus({ preventScroll: true });
    } else {
      els.categoryName.focus();
    }
  }, alreadyOpen ? 80 : 320);
}

function closeAdmin() {
  if (!state.adminOpen) return;
  state.adminOpen = false;
  state.editingCategoryId = null;
  els.adminBackdrop.classList.remove("is-open");
  els.adminDrawer.classList.remove("is-open");
  document.body.classList.remove("admin-open");
  state.adminHideTimer = window.setTimeout(() => {
    if (!state.adminOpen) {
      els.adminBackdrop.hidden = true;
      els.adminDrawer.hidden = true;
    }
  }, 320);
}

function openGuide() {
  const card = $(".modal-card", els.guideDialog);
  if (card) card.scrollTop = 0;
  els.guideDialog.showModal();
  document.body.classList.add("modal-open");
}

async function submitCategoryForm(event) {
  event.preventDefault();
  const name = els.categoryName.value.trim();
  const parentValue = els.categoryParent.value;
  if (!name) {
    showToast("请填写品类名称");
    els.categoryName.focus();
    return;
  }
  const button = $("button[type='submit']", els.categoryForm);
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "添加中…";
  try {
    const created = await api("/api/categories", {
      method: "POST",
      body: { name, parent_id: parentValue ? Number(parentValue) : null },
    });
    els.categoryName.value = "";
    els.categoryParent.value = "";
    await refreshAllData({ preserveSelection: true });
    if (created?.id) unfoldCategoryPath(created.id);
    renderAdmin();
    const createdCategory = created?.id ? findCategory(created.id) : null;
    if (createdCategory && !createdCategory.children.length) {
      // 新品类一定是最末级小类，直接选进「新增产品」，省得再找一遍。
      els.adminProductCategory.value = String(created.id);
      const suggested = suggestModelForCategory(created.id);
      if (suggested) els.adminProductModel.value = suggested;
      els.adminProductName.focus();
      showToast(`已添加品类「${name}」，已选为归属小类`);
    } else {
      showToast(`已添加品类「${name}」`);
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function saveCategoryName(categoryId) {
  const input = $(`[data-edit-input="${categoryId}"]`, els.categoryTree);
  const name = input?.value.trim() || "";
  if (!name) {
    showToast("品类名称不能为空");
    input?.focus();
    return;
  }
  try {
    await api(`/api/categories/${categoryId}`, { method: "PATCH", body: { name } });
    state.editingCategoryId = null;
    await refreshAllData({ preserveSelection: true });
    showToast("品类名称已更新");
    renderAdmin();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCategory(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return;
  if (category.borrowed_count > 0) {
    showToast(`「${category.name}」下还有 ${category.borrowed_count} 件产品在借，请先归还`);
    return;
  }
  const hasNested = category.children.length > 0;
  const hasProducts = category.product_count > 0;
  const detail = hasProducts || hasNested
    ? `该操作会一并移除 ${category.product_count} 件产品${hasNested ? "和全部子类" : ""}，历史流水会保留。`
    : "删除后不可恢复。";
  const confirmed = await askConfirm(
    `删除「${category.name}」？`,
    detail,
  );
  if (!confirmed) return;
  const url = `/api/categories/${categoryId}${hasProducts || hasNested ? "?cascade=1" : ""}`;
  try {
    const result = await api(url, { method: "DELETE" });
    await refreshAllData({ preserveSelection: true });
    showToast(result.deleted_products
      ? `已删除品类「${category.name}」及 ${result.deleted_products} 件产品`
      : `已删除品类「${category.name}」`);
    renderAdmin();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitProductForm(event) {
  event.preventDefault();
  const name = els.adminProductName.value.trim();
  const categoryId = els.adminProductCategory.value;
  const quantity = Number(els.adminProductQuantity.value);
  const modelKey = els.adminProductModel.value;
  if (!name) {
    showToast("请填写产品名称");
    els.adminProductName.focus();
    return;
  }
  if (!categoryId) {
    showToast("请选择归入的小类");
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    showToast("数量需要在 1–50 之间");
    return;
  }

  const note = productNotePayload();
  const button = $("button[type='submit']", els.productForm);
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "创建中…";
  try {
    const created = await api("/api/products", {
      method: "POST",
      body: { name, category_id: Number(categoryId), quantity, model_key: modelKey, ...note },
    });
    els.adminProductName.value = "";
    els.adminProductQuantity.value = "1";
    resetAdminNote();
    await refreshAllData({ preserveSelection: false });
    if (created.length) {
      unfoldCategoryPath(created[0].category_id);
      state.selectedId = created[0].id;
      state.activeCategoryId = created[0].category_id;
      expandCategoryAncestors(created[0].category_id);
      renderProducts();
    }
    renderAdmin();
    showToast(`已新增 ${created.length} 件「${name}」`);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Data loading / view routing
// ---------------------------------------------------------------------------

async function refreshAllData({ preserveSelection = true } = {}) {
  const previousId = state.selectedId;
  const previousCategory = state.activeCategoryId;
  const [products, categories, borrowers, historyAll, models] = await Promise.all([
    api("/api/products"),
    api("/api/categories"),
    api("/api/borrowers"),
    api("/api/history"),
    api("/api/models"),
  ]);

  state.products = sortProductsByName(products);
  state.categories = categories;
  state.borrowers = borrowers;
  state.historyAll = historyAll;
  applyModelLibrary(models);
  if (preserveSelection) state.selectedId = previousId;
  state.activeCategoryId = findCategory(previousCategory) ? previousCategory : null;

  const validIds = new Set(flattenCategories().map((category) => category.id));
  state.expandedCategoryIds = new Set(
    Array.from(state.expandedCategoryIds).filter((id) => validIds.has(id))
  );
  state.adminFoldedCategoryIds = new Set(
    Array.from(state.adminFoldedCategoryIds).filter((id) => validIds.has(id))
  );

  renderProducts();
  renderBorrowers();
  populateFilterOptions();
  syncFilterChrome();
  if (state.adminOpen) renderAdmin();

  if (filtersActive()) {
    await fetchHistory({ fade: false, resetPage: false });
  } else {
    state.history = historyAll;
    renderHistory();
  }
}

function setView(view, { updateHash = true, smooth = true } = {}) {
  if (!["products", "borrowers", "history"].includes(view)) view = "products";
  if (view !== "products" && state.modelOpen) closeModelStudio();

  for (const [name, section] of Object.entries(els.views)) {
    const active = name === view;
    section.hidden = !active;
    section.classList.remove("is-entering");
    if (active) {
      void section.offsetWidth;
      section.classList.add("is-entering");
    }
  }

  els.tabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  state.viewer?.setVisible(view === "products");
  if (view === "products") window.requestAnimationFrame(updateStripArrows);
  if (updateHash && window.location.hash !== `#${view}`) {
    window.history.replaceState(null, "", `#${view}`);
  }
  if (smooth) window.scrollTo({ top: 0, behavior: "smooth" });
  else window.scrollTo({ top: 0 });
}

function readViewFromHash() {
  const value = window.location.hash.replace(/^#/, "");
  return ["products", "borrowers", "history"].includes(value) ? value : "products";
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function askConfirm(title, message) {
  return new Promise((resolve) => {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    const dialog = els.confirmDialog;
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      syncModalOpenClass();
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", onClose);
    dialog.returnValue = "cancel";
    dialog.showModal();
    document.body.classList.add("modal-open");
  });
}

function setupViewer() {
  try {
    state.viewer = new ProductViewer(els.canvas, els.viewerFallback);
    state.viewer.onModelError = (message) => showToast(message);
    const product = getSelectedProduct();
    if (product) state.viewer.setProduct(product);
  } catch (error) {
    console.warn("3D viewer failed", error);
    els.viewerFallback.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function bindEvents() {
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", async () => {
      els.logoutBtn.disabled = true;
      try {
        await fetch("/api/logout", { method: "POST" });
      } finally {
        location.replace("/login");
      }
    });
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-id]");
    if (!button) return;
    selectCategory(button.dataset.categoryId);
  });

  els.categoryEmptyToggle.addEventListener("click", () => {
    state.showEmptyCategories = !state.showEmptyCategories;
    saveShowEmptyPreference(state.showEmptyCategories);
    renderCategories();
    $(".category-button.is-active", els.categoryList)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });

  els.productStrip.addEventListener("click", (event) => {
    const noteButton = event.target.closest("[data-product-note]");
    if (noteButton) {
      openNoteDialog(Number(noteButton.dataset.productNote));
      return;
    }
    const deleteButton = event.target.closest("[data-product-delete]");
    if (deleteButton) {
      if (deleteButton.disabled) return;
      removeProduct(Number(deleteButton.dataset.productDelete));
      return;
    }
    const card = event.target.closest(".product-card");
    if (!card) return;
    selectProduct(Number(card.dataset.productId));
  });

  els.stripPrev.addEventListener("click", () => scrollProductStrip(-1));
  els.stripNext.addEventListener("click", () => scrollProductStrip(1));
  els.productStrip.addEventListener("scroll", updateStripArrows, { passive: true });
  window.addEventListener("resize", updateStripArrows);
  // 鼠标滚轮在器物列表上直接横向滑动；到达两端后把滚动交还给页面。
  els.productStrip.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const strip = els.productStrip;
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    if (maxScroll <= 2) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientWidth : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;
    const atStart = strip.scrollLeft <= 0 && delta < 0;
    const atEnd = strip.scrollLeft >= maxScroll - 1 && delta > 0;
    if (atStart || atEnd) return;
    event.preventDefault();
    strip.scrollLeft += delta;
  }, { passive: false });

  els.productStrip.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const cards = $$(".product-card", els.productStrip);
    const index = cards.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "ArrowRight"
      ? Math.min(cards.length - 1, index + 1)
      : Math.max(0, index - 1);
    cards[next]?.focus();
    selectProduct(Number(cards[next].dataset.productId), { scroll: true });
  });

  els.galleryOpen.addEventListener("click", openGallery);
  els.gallerySearch.addEventListener("input", renderGallery);
  els.galleryGrid.addEventListener("click", (event) => {
    const noteButton = event.target.closest("[data-gallery-note]");
    if (noteButton) {
      openNoteDialog(Number(noteButton.dataset.galleryNote));
      return;
    }
    const card = event.target.closest("[data-gallery-product]");
    if (!card) return;
    selectGalleryProduct(Number(card.dataset.galleryProduct));
  });
  els.galleryFullscreen.addEventListener("click", toggleGalleryFullscreen);
  document.addEventListener("fullscreenchange", syncGalleryFullscreen);

  els.primaryAction.addEventListener("click", () => {
    const product = getSelectedProduct();
    if (!product) return;
    if (product.status === "rented") openReturnDialog();
    else openRentDialog();
  });

  els.borrowSameAction.addEventListener("click", () => {
    const product = getSelectedProduct();
    if (!product || product.status !== "rented") return;
    const alternative = state.borrowAlternatives[0];
    if (!alternative) {
      showToast("当前没有同类的在库产品");
      return;
    }
    openRentDialog({
      productId: alternative.id,
      borrower: product.current_borrower || "",
    });
  });

  els.secondaryAction.addEventListener("click", () => {
    const product = getSelectedProduct();
    if (!product?.current_borrower) return;
    setView("borrowers");
    window.setTimeout(() => highlightBorrower(product.current_borrower), 80);
  });

  els.borrowerRefresh.addEventListener("click", async () => {
    els.borrowerRefresh.classList.add("is-spinning");
    try {
      state.borrowers = await api("/api/borrowers");
      renderBorrowers();
      showToast("借用人数据已更新");
    } catch (error) {
      showToast(error.message);
    } finally {
      els.borrowerRefresh.classList.remove("is-spinning");
    }
  });

  els.borrowerAdd.addEventListener("click", openBorrowerDialog);
  els.borrowerForm.addEventListener("submit", submitBorrower);
  els.borrowerGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-borrower-delete]");
    if (!button || button.disabled) return;
    removeBorrower(Number(button.dataset.borrowerDelete));
  });

  els.historyAdd.addEventListener("click", openHistoryDialog);
  els.historyForm.addEventListener("submit", submitHistory);
  els.historyProduct.addEventListener("change", syncHistoryProductFields);
  els.historyBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-delete]");
    if (!button) return;
    removeHistoryRecord(Number(button.dataset.historyDelete));
  });

  $$("dialog [data-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });

  $$(".modal-dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      syncModalOpenClass();
    });
  });

  els.rentForm.addEventListener("submit", submitRent);
  els.returnForm.addEventListener("submit", submitReturn);

  els.rentOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const row = button.closest(".rent-option");
    const group = state.rentGroups[Number(row.dataset.groupIndex)];
    if (!group) return;
    const direction = Number(button.dataset.step);
    group.quantity = Math.max(0, Math.min(group.products.length, group.quantity + direction));
    updateRentSelectionUI();
  });

  els.returnOptions.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".return-checkbox");
    if (!checkbox) return;
    const rentalId = Number(checkbox.dataset.rentalId);
    const item = state.returnItems.find((entry) => entry.product.active_rental_id === rentalId);
    if (!item) return;
    item.checked = checkbox.checked;
    checkbox.closest(".return-option").classList.toggle("is-selected", checkbox.checked);
    updateReturnSelectionUI();
  });

  els.rentBorrower.addEventListener("input", () => {
    els.rentBorrowerError.textContent = "";
    els.rentBorrower.classList.remove("is-invalid");
  });
  els.rentDate.addEventListener("input", () => {
    els.rentDateError.textContent = "";
    els.rentDate.classList.remove("is-invalid");
  });
  els.returnDate.addEventListener("input", () => {
    els.returnDateError.textContent = "";
    els.returnDate.classList.remove("is-invalid");
  });

  els.filterBorrower.addEventListener("change", () => {
    syncFilterChrome();
    fetchHistory();
  });
  els.filterCategory.addEventListener("change", () => {
    syncFilterChrome();
    fetchHistory();
  });
  els.filterFrom.addEventListener("change", () => {
    syncFilterChrome();
    fetchHistory();
  });
  els.filterTo.addEventListener("change", () => {
    syncFilterChrome();
    fetchHistory();
  });
  els.filterSearch.addEventListener("input", () => {
    syncFilterChrome();
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => fetchHistory(), 260);
  });
  els.searchClear.addEventListener("click", () => {
    els.filterSearch.value = "";
    syncFilterChrome();
    fetchHistory();
    els.filterSearch.focus();
  });
  els.filterReset.addEventListener("click", resetFilters);

  els.historyPagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    renderHistory();
    els.historyShell.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.adminOpenHeader.addEventListener("click", () => openAdmin("category"));
  els.adminOpenAdd.addEventListener("click", () => openAdmin("category"));
  els.productAddOpen.addEventListener("click", () => openAdmin("product"));
  els.adminClose.addEventListener("click", closeAdmin);
  els.adminBackdrop.addEventListener("click", closeAdmin);
  els.adminTreeToggle.addEventListener("click", () => {
    adminToggleAllFolded();
    renderAdmin();
  });
  els.guideOpen.addEventListener("click", openGuide);
  els.guideOpenAdd.addEventListener("click", () => {
    closeDialog(els.guideDialog);
    openAdmin("product");
  });
  els.categoryForm.addEventListener("submit", submitCategoryForm);
  els.productForm.addEventListener("submit", submitProductForm);
  els.adminProductCategory.addEventListener("change", () => {
    const suggested = suggestModelForCategory(Number(els.adminProductCategory.value));
    if (suggested) els.adminProductModel.value = suggested;
  });
  els.adminNoteText.addEventListener("input", updateAdminNoteCount);
  els.adminNoteFile.addEventListener("change", handleAdminNoteFileChange);
  els.adminNoteRemove.addEventListener("click", removeAdminNoteImage);
  els.notePlaceholderForm.addEventListener("submit", submitNotePlaceholder);
  els.notePlaceholderReset.addEventListener("click", resetNotePlaceholder);
  els.notePlaceholderEdit.addEventListener("click", openNotePlaceholderEditor);

  els.modelOpen.addEventListener("click", openModelStudio);
  els.modelClose.addEventListener("click", () => closeModelStudio());
  els.modelCancel.addEventListener("click", () => closeModelStudio());
  els.modelApply.addEventListener("click", applyModelStudio);
  els.modelGenerateOpen.addEventListener("click", openGenerateDialog);
  els.generateForm.addEventListener("submit", submitGenerate);
  els.generateName.addEventListener("input", () => {
    els.generateError.textContent = "";
    els.generateName.classList.remove("is-invalid");
  });

  els.modelStyleGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-model-key]");
    if (!button || !state.modelDraft) return;
    const product = getSelectedProduct();
    state.modelDraft.modelKey = button.dataset.modelKey;
    state.modelDraft.seed = button.dataset.modelKey === "generated"
      ? hashText(product?.name || "generated")
      : 1;
    els.modelGeneratedHint.hidden = true;
    renderModelStyles();
    renderPrototypeList();
    previewModelDraft();
  });

  els.modelCustomGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-custom-model-key]");
    if (!button || !state.modelDraft) return;
    state.modelDraft.modelKey = button.dataset.customModelKey;
    state.modelDraft.seed = 1;
    state.modelDraft.finish = "default";
    els.modelGeneratedHint.hidden = true;
    renderModelStyles();
    renderPrototypeList();
    previewModelDraft();
  });

  els.modelLibraryOpen.addEventListener("click", openModelLibrary);
  els.modelImportFile.addEventListener("change", () => {
    const file = els.modelImportFile.files?.[0];
    els.modelImportFilename.textContent = file ? file.name : "未选择文件";
    els.modelImportError.textContent = "";
  });
  els.modelImportForm.addEventListener("submit", submitModelImport);
  els.modelLibraryTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-library-tab]");
    if (!tab) return;
    state.modelLibraryTab = tab.dataset.libraryTab;
    renderModelLibrary();
  });
  els.modelLibraryList.addEventListener("click", (event) => {
    const use = event.target.closest("[data-model-use]");
    if (use) {
      useModelFromLibrary(use.dataset.modelUse);
      return;
    }
    const hide = event.target.closest("[data-model-hide]");
    if (hide && !hide.disabled) {
      hideBuiltinModel(hide.dataset.modelHide);
      return;
    }
    const restore = event.target.closest("[data-model-restore]");
    if (restore) {
      restoreBuiltinModel(restore.dataset.modelRestore);
      return;
    }
    const remove = event.target.closest("[data-model-delete-custom]");
    if (remove && !remove.disabled) {
      deleteCustomModel(Number(remove.dataset.modelDeleteCustom));
    }
  });

  els.prototypeSearch.addEventListener("input", renderPrototypeList);

  els.prototypeList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-prototype-key]");
    if (!row || !state.modelDraft) return;
    const product = getSelectedProduct();
    state.modelDraft.modelKey = row.dataset.prototypeKey;
    state.modelDraft.seed = row.dataset.prototypeKey === "generated"
      ? hashText(product?.name || "generated")
      : 1;
    els.modelGeneratedHint.hidden = true;
    renderModelStyles();
    renderPrototypeList();
    previewModelDraft();
  });

  els.modelFinishOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-finish]");
    if (!button || !state.modelDraft) return;
    state.modelDraft.finish = button.dataset.finish;
    renderModelFinishes();
    previewModelDraft();
  });

  els.modelScopeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scope]");
    if (!button || !state.modelDraft) return;
    state.modelDraft.scope = button.dataset.scope;
    renderModelScopes();
  });

  const bindScale = (input, output, axis) => {
    input.addEventListener("input", () => {
      if (!state.modelDraft) return;
      const percent = Number(input.value);
      output.textContent = `${percent}%`;
      state.modelDraft.scale[axis] = percent / 100;
      previewModelDraft();
    });
  };
  bindScale(els.modelScaleX, els.modelScaleXValue, "x");
  bindScale(els.modelScaleY, els.modelScaleYValue, "y");
  bindScale(els.modelScaleZ, els.modelScaleZValue, "z");

  els.modelScaleReset.addEventListener("click", () => {
    if (!state.modelDraft) return;
    state.modelDraft.scale = { x: 1, y: 1, z: 1 };
    syncScaleControls();
    previewModelDraft();
  });

  els.categoryTree.addEventListener("click", (event) => {
    const caret = event.target.closest("[data-category-toggle]");
    if (caret) {
      const categoryId = Number(caret.dataset.categoryToggle);
      if (state.adminFoldedCategoryIds.has(categoryId)) {
        state.adminFoldedCategoryIds.delete(categoryId);
      } else {
        state.adminFoldedCategoryIds.add(categoryId);
      }
      renderAdmin();
      $(`[data-category-toggle="${categoryId}"]`, els.categoryTree)?.focus();
      return;
    }
    const action = event.target.closest("[data-category-action]");
    if (!action) return;
    const categoryId = Number(action.dataset.id);
    const type = action.dataset.categoryAction;
    if (type === "edit") {
      state.editingCategoryId = categoryId;
      renderCategoryTree();
      return;
    }
    if (type === "cancel") {
      state.editingCategoryId = null;
      renderCategoryTree();
      return;
    }
    if (type === "save") {
      saveCategoryName(categoryId);
      return;
    }
    if (type === "delete") {
      deleteCategory(categoryId);
      return;
    }
    if (type === "add-child") {
      const category = findCategory(categoryId);
      if (!category) return;
      const depth = category.depth || 0;
      if (depth >= 4) {
        showToast("最多支持四级品类");
        return;
      }
      els.categoryParent.value = String(categoryId);
      els.categoryName.focus();
      els.categoryName.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  els.categoryTree.addEventListener("keydown", (event) => {
    if (!state.editingCategoryId) return;
    if (event.key === "Enter") {
      event.preventDefault();
      saveCategoryName(state.editingCategoryId);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      state.editingCategoryId = null;
      renderCategoryTree();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || $("dialog[open]")) return;
    if (state.modelOpen) closeModelStudio();
    else if (state.adminOpen) closeAdmin();
  });

  window.addEventListener("hashchange", () => {
    setView(readViewFromHash(), { updateHash: false });
  });
}

function initAdminModelSelect() {
  els.adminProductModel.innerHTML = buildModelOptions("lounge-chair");
}

async function init() {
  setHeaderDate();
  bindEvents();
  initAdminModelSelect();
  updateAdminNoteCount();
  state.showEmptyCategories = readShowEmptyPreference();
  els.rentDate.value = todayISO();
  els.returnDate.value = todayISO();

  try {
    const me = await api("/api/me");
    state.user = me?.user || null;
    applyUser();
  } catch (error) {
    console.error(error);
  }

  await fetchSettings();

  try {
    const [products, categories, borrowers, historyAll, models] = await Promise.all([
      api("/api/products"),
      api("/api/categories"),
      api("/api/borrowers"),
      api("/api/history"),
      api("/api/models"),
    ]);
    state.products = sortProductsByName(products);
    state.categories = categories;
    state.borrowers = borrowers;
    state.historyAll = historyAll;
    state.history = historyAll;
    applyModelLibrary(models);
    state.selectedId = state.products[0]?.id ?? null;

    renderProducts();
    renderBorrowers();
    populateFilterOptions();
    syncFilterChrome();
    renderHistory();
    setupViewer();
    setView(readViewFromHash(), { updateHash: false, smooth: false });
  } catch (error) {
    console.error(error);
    showToast(error.message);
    els.borrowerSummary.textContent = "数据读取失败，请确认服务已启动。";
    els.borrowerGrid.hidden = true;
    els.borrowerEmpty.hidden = false;
  }
}

init();
