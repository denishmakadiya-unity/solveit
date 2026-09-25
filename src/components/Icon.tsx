import * as L from "react-icons/lu";

const MAP = {
  "file-text": L.LuFileText, "file-down": L.LuFileDown, "file-stack": L.LuFileStack, scissors: L.LuScissors,
  "file-image": L.LuFileImage, images: L.LuImages, "scan-text": L.LuScanText, "image-down": L.LuImageDown,
  scaling: L.LuScaling, repeat: L.LuRepeat, crop: L.LuCrop, eraser: L.LuEraser, "shield-off": L.LuShieldOff,
  "case-sensitive": L.LuCaseSensitive, "whole-word": L.LuWholeWord, "git-compare": L.LuGitCompare,
  percent: L.LuPercent, cake: L.LuCake, landmark: L.LuLandmark, receipt: L.LuReceipt, tag: L.LuTag,
  ruler: L.LuRuler, braces: L.LuBraces, "badge-check": L.LuBadgeCheck, minimize: L.LuMinimize2,
  binary: L.LuBinary, fingerprint: L.LuFingerprint, "qr-code": L.LuQrCode, "key-round": L.LuKeyRound,
  "shield-check": L.LuShieldCheck, hash: L.LuHash, "trending-up": L.LuTrendingUp, "piggy-bank": L.LuPiggyBank,
  table: L.LuTable, "file-json": L.LuFileJson, sparkles: L.LuSparkles, "pen-line": L.LuPenLine, mail: L.LuMail,
  search: L.LuSearch, wand: L.LuWandSparkles, workflow: L.LuWorkflow, grid: L.LuLayoutGrid, layers: L.LuLayers,
  bot: L.LuBot, folder: L.LuFolderOpen, user: L.LuUser, sun: L.LuSun, moon: L.LuMoon, monitor: L.LuMonitor,
  globe: L.LuGlobe, menu: L.LuMenu, x: L.LuX, "arrow-right": L.LuArrowRight, "arrow-left": L.LuArrowLeft,
  check: L.LuCheck, upload: L.LuUpload, download: L.LuDownload, share: L.LuShare2, repeat2: L.LuRotateCcw,
  star: L.LuStar, trash: L.LuTrash2, grip: L.LuGripVertical, "chevron-up": L.LuChevronUp,
  "chevron-down": L.LuChevronDown, "chevron-right": L.LuChevronRight, plus: L.LuPlus, minus: L.LuMinus,
  copy: L.LuCopy, lock: L.LuLock, zap: L.LuZap, clock: L.LuClock, help: L.LuCircleHelp, info: L.LuInfo,
  alert: L.LuTriangleAlert, book: L.LuBookOpen, home: L.LuHouse, settings: L.LuSettings, chart: L.LuChartColumn,
  users: L.LuUsers, message: L.LuMessageSquare, flag: L.LuFlag, toggle: L.LuToggleRight, megaphone: L.LuMegaphone,
  rupee: L.LuIndianRupee, gauge: L.LuGauge, "search-x": L.LuSearchX, play: L.LuPlay, save: L.LuSave,
  history: L.LuHistory, heart: L.LuHeart, "arrow-up-down": L.LuArrowUpDown, "circle-check": L.LuCircleCheck,
  loader: L.LuLoaderCircle, external: L.LuExternalLink, smartphone: L.LuSmartphone, instagram: L.LuInstagram,
  "file-check": L.LuFileCheck, printer: L.LuPrinter, graduation: L.LuGraduationCap, bag: L.LuShoppingBag,
  code: L.LuCodeXml, palette: L.LuPalette, camera: L.LuCamera, send: L.LuSend, sliders: L.LuSlidersHorizontal,
  pencil: L.LuPencil, "list-checks": L.LuListChecks, calendar: L.LuCalendar, link: L.LuLink, logout: L.LuLogOut,
  split: L.LuSplit, merge: L.LuMerge, "file-type": L.LuFileType, combine: L.LuCombine, "image-plus": L.LuImagePlus,
  files: L.LuFiles, "file-search": L.LuFileSearch, shrink: L.LuShrink, maximize: L.LuMaximize2, eye: L.LuEye,
  "eye-off": L.LuEyeOff, "scan-face": L.LuScanFace, image: L.LuImage, calculator: L.LuCalculator,
  briefcase: L.LuBriefcase, type: L.LuType,
} as const;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const C = (MAP as any)[name] || L.LuSparkles;
  return <C size={size} className={className} aria-hidden="true" focusable="false" />;
}
