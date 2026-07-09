"use client";

import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CloudArrowUpIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  SparklesIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Page =
  | "home"
  | "capture"
  | "confirm"
  | "detect"
  | "style"
  | "generating"
  | "result"
  | "inspiration"
  | "history"
  | "profile";

type StyleOption = {
  id: string;
  name: string;
  desc: string;
  image: string;
};

type HistoryItem = {
  id: string;
  name: string;
  time: string;
  count: number;
  image: string;
};

const tabPages: Page[] = ["home", "inspiration", "history", "profile"];

const structureRules = [
  "墙面、天花、梁柱、门窗位置不变",
  "空间轮廓与透视线不变",
  "家具、柜体、灯具、窗帘、地毯、挂画、绿植可替换",
];

const qualityChecks = ["墙面完整", "天花可见", "地面透视清晰", "门窗轮廓清楚"];

const generateSteps = [
  "锁定墙面、天花与空间透视",
  "识别可替换家具与柜体区域",
  "生成家具和软装搭配",
  "检查硬装结构一致性",
];

const styleOptions: StyleOption[] = [
  {
    id: "cream",
    name: "奶油风",
    desc: "温柔浅色、圆润家具、柔软织物质感。",
    image: "/generated-pic-2.jpg",
  },
  {
    id: "wood",
    name: "原木风",
    desc: "自然木色、通透采光、简洁耐看。",
    image: "/generated-pic.png",
  },
  {
    id: "modern",
    name: "现代简约",
    desc: "利落线条、低饱和配色、功能优先。",
    image: "/generatedpic.png",
  },
  {
    id: "midcentury",
    name: "中古风",
    desc: "复古轮廓、胡桃木与跳色软装。",
    image: "/screenshot.png",
  },
];

const inspirationItems = [
  {
    id: "insp-cream",
    name: "奶油白客厅",
    tag: "奶油风",
    desc: "米白基调搭配圆润沙发，空间更柔和。",
    image: "/generated-pic-2.jpg",
  },
  {
    id: "insp-wood",
    name: "原木卧室",
    tag: "原木风",
    desc: "浅木色和亚麻质感，适合卧室与书房。",
    image: "/generated-pic.png",
  },
  {
    id: "insp-modern",
    name: "现代简约厅",
    tag: "现代简约",
    desc: "干净线条和模块化收纳，视觉更清爽。",
    image: "/generatedpic.png",
  },
  {
    id: "insp-mid",
    name: "中古书房",
    tag: "中古风",
    desc: "复古单椅、胡桃木柜体和暖色灯光。",
    image: "/screenshot.png",
  },
];

const initialHistory: HistoryItem[] = [
  {
    id: "h1",
    name: "客厅 · 奶油风改造",
    time: "2 小时前",
    count: 2,
    image: "/generated-pic-2.jpg",
  },
  {
    id: "h2",
    name: "卧室 · 原木风改造",
    time: "昨天 20:14",
    count: 2,
    image: "/generated-pic.png",
  },
];

export default function HomePage() {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<Page>("home");
  const [stack, setStack] = useState<Page[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("我家的房间");
  const [selectedStyle, setSelectedStyle] = useState("cream");
  const [customStyleUrl, setCustomStyleUrl] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"A" | "B">("A");
  const [activeStep, setActiveStep] = useState(0);
  const [comparePct, setComparePct] = useState(50);
  const [compositionGood, setCompositionGood] = useState(true);
  const [toast, setToast] = useState("");
  const [historyItems, setHistoryItems] = useState(initialHistory);
  const [favoriteInspirations, setFavoriteInspirations] = useState<string[]>([]);
  const [favoritePlans, setFavoritePlans] = useState<string[]>([]);

  const selectedStyleOption = useMemo(() => {
    if (selectedStyle === "custom") {
      return {
        id: "custom",
        name: "我的参考图",
        desc: "按你上传的参考图片提取家具与软装风格。",
        image: customStyleUrl || "/generated-pic-2.jpg",
      };
    }

    return (
      styleOptions.find((item) => item.id === selectedStyle) || styleOptions[0]
    );
  }, [customStyleUrl, selectedStyle]);

  const plans = useMemo(() => {
    const baseIndex = Math.max(
      0,
      styleOptions.findIndex((item) => item.id === selectedStyleOption.id)
    );
    const alternate = styleOptions[(baseIndex + 1) % styleOptions.length];

    return {
      A: {
        id: `${selectedStyleOption.id}-a`,
        name: `${selectedStyleOption.name}方案`,
        desc: "替换家具、柜体和软装，硬装结构保持不变。",
        image: selectedStyleOption.image,
      },
      B: {
        id: `${alternate.id}-b`,
        name: `${alternate.name}备选方案`,
        desc: "保留同一空间结构，提供另一套家具组合。",
        image: alternate.image,
      },
    };
  }, [selectedStyleOption]);

  const currentPlan = plans[resultTab];
  const beforeImage = photoUrl || "/original-pic.jpg";

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (page !== "generating") return;

    setActiveStep(0);
    const timers = generateSteps.map((_, index) =>
      window.setTimeout(() => setActiveStep(index), 500 + index * 680)
    );
    const doneTimer = window.setTimeout(() => {
      setPage("result");
      setResultTab("A");
      setComparePct(50);
    }, 3600);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
    };
  }, [page]);

  function navigate(nextPage: Page) {
    setStack((prev) => {
      if (tabPages.includes(page) && !tabPages.includes(nextPage)) return [];
      if (!tabPages.includes(page)) return [...prev, page];
      return prev;
    });
    setPage(nextPage);
  }

  function goBack(fallback: Page = "home") {
    const previous = stack[stack.length - 1];
    setStack((prev) => prev.slice(0, -1));
    setPage(previous || fallback);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name.replace(/\.[^/.]+$/, "") || "我家的房间");
    setPage("confirm");
    event.target.value = "";
  }

  function handleStyleReferenceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomStyleUrl(URL.createObjectURL(file));
    setSelectedStyle("custom");
    setToast("已上传参考图");
    event.target.value = "";
  }

  function startMockCapture() {
    setPhotoUrl("/original-pic.jpg");
    setPhotoName("示例房间");
    navigate("confirm");
  }

  function clearFurniture() {
    setToast("正在清除可替换家具，硬装结构已锁定");
    window.setTimeout(() => navigate("style"), 850);
  }

  function saveCurrentPlan() {
    setHistoryItems((prev) => [
      {
        id: `${Date.now()}`,
        name: `${photoName} · ${currentPlan.name}`,
        time: "刚刚",
        count: 2,
        image: currentPlan.image,
      },
      ...prev,
    ]);
    setToast("已保存到历史");
  }

  function toggleFavoritePlan() {
    setFavoritePlans((prev) =>
      prev.includes(currentPlan.id)
        ? prev.filter((id) => id !== currentPlan.id)
        : [...prev, currentPlan.id]
    );
  }

  function toggleFavoriteInspiration(id: string) {
    setFavoriteInspirations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectInspirationAsStyle(item: (typeof inspirationItems)[number]) {
    setCustomStyleUrl(item.image);
    setSelectedStyle("custom");
    setToast(`已将「${item.name}」设为参考风格`);
    navigate("capture");
  }

  return (
    <main className="min-h-screen bg-[#e9e4d6] text-[#2a2620]">
      <input
        ref={galleryInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
      />
      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
      />
      <input
        ref={styleInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={handleStyleReferenceChange}
      />

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 bg-[#f6f0e3] shadow-[0_24px_80px_rgba(42,38,32,0.18)] md:min-h-[calc(100vh-48px)] md:grid-cols-[232px_1fr] md:rounded-[28px] md:my-6 md:overflow-hidden">
        <DesktopNav page={page} onNavigate={navigate} />

        <section className="relative min-h-screen overflow-hidden md:min-h-0">
          <div className="h-full overflow-y-auto pb-24 md:pb-0">
            {page === "home" && (
              <HomeView
                onStart={() => navigate("capture")}
                onSearch={() => setToast("搜索功能后面接风格库")}
                onProfile={() => navigate("profile")}
              />
            )}

            {page === "capture" && (
              <CaptureView
                compositionGood={compositionGood}
                onBack={() => goBack()}
                onExample={() => setToast("尽量拍到完整墙面、天花和地面透视")}
                onGallery={() => galleryInputRef.current?.click()}
                onCamera={() => cameraInputRef.current?.click()}
                onMockCapture={startMockCapture}
                onToggleComposition={() => setCompositionGood((value) => !value)}
              />
            )}

            {page === "confirm" && (
              <ConfirmView
                photoUrl={beforeImage}
                onBack={() => goBack("capture")}
                onRetake={() => navigate("capture")}
                onNext={() => navigate("detect")}
              />
            )}

            {page === "detect" && (
              <DetectView
                photoUrl={beforeImage}
                onBack={() => goBack("confirm")}
                onClear={clearFurniture}
                onSkip={() => navigate("style")}
              />
            )}

            {page === "style" && (
              <StyleView
                customStyleUrl={customStyleUrl}
                selectedStyle={selectedStyle}
                onBack={() => goBack("detect")}
                onSelectStyle={setSelectedStyle}
                onUploadStyle={() => styleInputRef.current?.click()}
                onGenerate={() => navigate("generating")}
              />
            )}

            {page === "generating" && <GeneratingView activeStep={activeStep} />}

            {page === "result" && (
              <ResultView
                beforeImage={beforeImage}
                comparePct={comparePct}
                currentPlan={currentPlan}
                favorite={favoritePlans.includes(currentPlan.id)}
                resultTab={resultTab}
                onBack={() => goBack("style")}
                onCompare={setComparePct}
                onDownload={() => setToast("真实接入后下载高清图")}
                onRegenerate={() => navigate("style")}
                onSave={saveCurrentPlan}
                onTab={setResultTab}
                onToggleFavorite={toggleFavoritePlan}
              />
            )}

            {page === "inspiration" && (
              <InspirationView
                favorites={favoriteInspirations}
                onFavorite={toggleFavoriteInspiration}
                onSelect={selectInspirationAsStyle}
              />
            )}

            {page === "history" && (
              <HistoryView
                items={historyItems}
                onOpen={() => setToast("历史详情后面接真实结果页")}
              />
            )}

            {page === "profile" && (
              <ProfileView
                favoriteCount={favoriteInspirations.length + favoritePlans.length}
                historyCount={historyItems.length}
                onHistory={() => navigate("history")}
                onSoon={(message) => setToast(message)}
              />
            )}
          </div>

          {tabPages.includes(page) && (
            <MobileTabs page={page} onNavigate={navigate} />
          )}

          {toast && (
            <div className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2a2620] px-5 py-3 text-sm font-semibold text-[#fffaf0] shadow-[0_10px_24px_rgba(0,0,0,0.24)] md:bottom-6">
              {toast}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DesktopNav({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const items = [
    { id: "home" as Page, label: "首页", icon: HomeIcon },
    { id: "inspiration" as Page, label: "灵感", icon: SparklesIcon },
    { id: "history" as Page, label: "历史", icon: ClockIcon },
    { id: "profile" as Page, label: "我的", icon: UserIcon },
  ];

  return (
    <aside className="hidden border-r border-[#e6ddc9] bg-[#fffcf5] px-4 py-5 md:block">
      <div className="mb-8">
        <div className="font-serif text-xl font-bold">AI 焕然一居</div>
        <p className="mt-2 text-xs leading-5 text-[#736a5a]">
          硬装结构锁定，只换家具软装。
        </p>
      </div>
      <nav className="grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;

          return (
            <button
              key={item.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                active
                  ? "bg-[#2e4a3d] text-[#f6f0e3]"
                  : "text-[#736a5a] hover:bg-[#e8eee8]"
              }`}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-[#e6ddc9] bg-[#f6f0e3] p-4">
        <div className="text-sm font-black">结构保护规则</div>
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#736a5a]">
          {structureRules.map((rule) => (
            <li className="flex gap-2" key={rule}>
              <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-[#2e4a3d]" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e6ddc9]/90 bg-[#f6f0e3]/95 px-4 py-3 backdrop-blur md:static">
      {onBack ? (
        <IconButton label="返回" onClick={onBack}>
          <ArrowLeftIcon className="h-5 w-5" />
        </IconButton>
      ) : (
        <div className="h-10 w-10" />
      )}
      <div className="font-serif text-[17px] font-bold">{title}</div>
      <div className="flex h-10 min-w-10 items-center justify-end">{right}</div>
    </header>
  );
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-full border border-transparent transition ${
        active
          ? "bg-[#f3e7cc] text-[#b98a46]"
          : "bg-black/5 text-[#2a2620] hover:bg-black/10"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function HomeView({
  onStart,
  onSearch,
  onProfile,
}: {
  onStart: () => void;
  onSearch: () => void;
  onProfile: () => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden md:grid md:min-h-full md:grid-cols-[1fr_360px]">
      <section className="relative min-h-screen bg-[linear-gradient(180deg,rgba(20,20,15,0.32),rgba(20,20,15,0.08)_28%,rgba(15,15,10,0.78)),url('/original-pic.jpg')] bg-cover bg-center md:min-h-full">
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 text-[#fffdf7]">
          <div className="font-serif text-lg font-bold">AI 焕然一居</div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <button className="flex items-center gap-1" type="button" onClick={onSearch}>
              <MagnifyingGlassIcon className="h-4 w-4" />
              搜索
            </button>
            <span className="text-white/40">|</span>
            <button type="button" onClick={onProfile}>
              我的
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-28 text-[#fffdf7] md:max-w-[620px] md:pb-14">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#f3d98e]">
            Structure Locked
          </p>
          <h1 className="font-serif text-[34px] font-bold leading-[1.24] md:text-5xl">
            看看你家
            <br />
            换套家具会怎样
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/85">
            保留墙面、天花、门窗和空间透视，只替换家具、柜体与软装。
          </p>
          <button
            className="mt-6 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#f6f0e3] px-5 text-[15px] font-black text-[#1f332a] shadow-[0_10px_24px_rgba(0,0,0,0.22)] md:w-auto md:min-w-[240px]"
            type="button"
            onClick={onStart}
          >
            <CloudArrowUpIcon className="h-5 w-5" />
            上传我家照片
          </button>
        </div>
      </section>

      <aside className="hidden bg-[#fffcf5] p-6 md:block">
        <h2 className="font-serif text-2xl font-bold">第一版功能目标</h2>
        <div className="mt-5 grid gap-3">
          {structureRules.map((rule) => (
            <div
              className="flex items-start gap-3 rounded-2xl border border-[#e6ddc9] bg-[#f6f0e3] p-4"
              key={rule}
            >
              <CheckIcon className="mt-0.5 h-5 w-5 flex-none text-[#2e4a3d]" />
              <span className="text-sm font-bold leading-6">{rule}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-[#e8eee8] p-4 text-sm leading-6 text-[#2e4a3d]">
          当前先做前端交互和技术骨架，真实模型接口后面以 provider 方式接入。
        </div>
      </aside>
    </div>
  );
}

function CaptureView({
  compositionGood,
  onBack,
  onCamera,
  onExample,
  onGallery,
  onMockCapture,
  onToggleComposition,
}: {
  compositionGood: boolean;
  onBack: () => void;
  onCamera: () => void;
  onExample: () => void;
  onGallery: () => void;
  onMockCapture: () => void;
  onToggleComposition: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#111] md:min-h-full">
      <header className="relative z-10 flex items-center justify-between px-4 py-4 text-[#f8f5ec]">
        <IconButton label="返回" onClick={onBack}>
          <ArrowLeftIcon className="h-5 w-5 text-[#f8f5ec]" />
        </IconButton>
        <div className="font-serif text-[17px] font-bold">拍摄房间</div>
        <button className="text-sm font-bold" type="button" onClick={onExample}>
          示例
        </button>
      </header>

      <section className="relative flex-1 bg-[linear-gradient(rgba(0,0,0,0.18),rgba(0,0,0,0.18)),url('/original-pic.jpg')] bg-cover bg-center">
        <div className="absolute inset-x-0 top-[8%] text-center text-[13px] font-semibold text-[#fbf7ec] drop-shadow">
          让墙角、天花和地面线落在虚线范围内
        </div>
        <div className="absolute inset-x-[8%] bottom-[22%] top-[15%] rounded-2xl border-2 border-dashed border-white/80">
          <div className="absolute -left-0.5 -top-0.5 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-[#f3d98e]" />
          <div className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-[#f3d98e]" />
          <div className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-[#f3d98e]" />
          <div className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-[#f3d98e]" />
        </div>
        <div className="absolute bottom-[28%] left-[8%] right-[8%] border-t-2 border-dashed border-[#f3d98e]/90" />
        <div className="absolute bottom-[22%] left-1/2 top-[15%] border-l-2 border-dashed border-[#f3d98e]/70" />
        <div
          className={`absolute bottom-[8%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold ${
            compositionGood
              ? "bg-[#2e4a3d]/95 text-[#eaf3ea]"
              : "bg-[#c08a2e]/95 text-[#fff7e6]"
          }`}
        >
          {compositionGood && <CheckIcon className="h-4 w-4" />}
          {compositionGood ? "构图良好，可以拍摄" : "保持手机水平，露出墙面和天花"}
        </div>
      </section>

      <footer className="grid grid-cols-3 items-center gap-4 px-8 py-5 text-[#f8f5ec]">
        <button
          className="grid justify-items-center gap-1 text-sm font-bold"
          type="button"
          onClick={onGallery}
        >
          <PhotoIcon className="h-7 w-7" />
          相册
        </button>
        <button
          className="mx-auto h-[72px] w-[72px] rounded-full border-4 border-white/40 bg-white shadow-inner"
          aria-label="模拟拍摄"
          type="button"
          onClick={onMockCapture}
        />
        <button
          className="grid justify-items-center gap-1 text-sm font-bold"
          type="button"
          onClick={onCamera}
        >
          <CameraIcon className="h-7 w-7" />
          拍照
        </button>
      </footer>

      <button
        className="pb-5 text-center text-xs font-semibold text-white/55"
        type="button"
        onClick={onToggleComposition}
      >
        切换构图提示状态
      </button>
    </div>
  );
}

function ConfirmView({
  photoUrl,
  onBack,
  onNext,
  onRetake,
}: {
  photoUrl: string;
  onBack: () => void;
  onNext: () => void;
  onRetake: () => void;
}) {
  return (
    <>
      <Topbar title="确认照片" onBack={onBack} />
      <div className="mx-auto max-w-3xl px-4 py-5">
        <div
          className="h-[360px] rounded-[20px] bg-cover bg-center shadow-[0_10px_30px_rgba(42,38,32,0.12)] md:h-[460px]"
          style={{ backgroundImage: `url('${photoUrl}')` }}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {qualityChecks.map((check) => (
            <div
              className="flex items-center gap-3 rounded-2xl bg-[#fffcf5] p-4 text-sm font-bold shadow-[0_10px_30px_rgba(42,38,32,0.08)]"
              key={check}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e8eee8] text-[#2e4a3d]">
                <CheckIcon className="h-4 w-4" />
              </span>
              {check}
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn-secondary flex-1" type="button" onClick={onRetake}>
            重新选择
          </button>
          <button className="btn-primary flex-[1.4]" type="button" onClick={onNext}>
            开始识别
          </button>
        </div>
      </div>
    </>
  );
}

function DetectView({
  photoUrl,
  onBack,
  onClear,
  onSkip,
}: {
  photoUrl: string;
  onBack: () => void;
  onClear: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <Topbar title="AI 空间识别" onBack={onBack} />
      <div className="mx-auto max-w-3xl px-4 py-5">
        <p className="text-sm leading-7 text-[#736a5a]">
          AI 将识别可替换的家具、柜体与软装区域。生成过程中会锁定
          <b className="text-[#2a2620]"> 墙面、天花、门窗、梁柱和空间透视 </b>
          ，避免硬装结构变化。
        </p>

        <div
          className="relative mt-4 h-[330px] overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_10px_30px_rgba(42,38,32,0.12)] md:h-[470px]"
          style={{ backgroundImage: `url('${photoUrl}')` }}
        >
          <DetectBox label="沙发" className="left-[8%] top-[55%] h-[28%] w-[42%]" />
          <DetectBox label="柜体" className="left-[55%] top-[20%] h-[36%] w-[32%]" />
          <DetectBox label="软装" className="left-[60%] top-[66%] h-[16%] w-[24%]" />
          <div className="absolute inset-x-4 top-4 rounded-xl bg-black/45 px-3 py-2 text-xs font-bold text-white">
            硬装锁定：墙面 / 天花 / 门窗 / 透视线
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <button className="btn-primary" type="button" onClick={onClear}>
            一键清除原有家具
          </button>
          <button className="btn-secondary" type="button" onClick={onSkip}>
            跳过，直接选风格
          </button>
        </div>
      </div>
    </>
  );
}

function DetectBox({ label, className }: { label: string; className: string }) {
  return (
    <div
      className={`absolute rounded-lg border-2 border-dashed border-[#f3d98e] ${className}`}
    >
      <span className="absolute -top-3 left-2 rounded-md bg-[#f3d98e] px-2 py-0.5 text-[11px] font-black text-[#4a3418]">
        {label}
      </span>
    </div>
  );
}

function StyleView({
  customStyleUrl,
  selectedStyle,
  onBack,
  onGenerate,
  onSelectStyle,
  onUploadStyle,
}: {
  customStyleUrl: string | null;
  selectedStyle: string;
  onBack: () => void;
  onGenerate: () => void;
  onSelectStyle: (style: string) => void;
  onUploadStyle: () => void;
}) {
  return (
    <>
      <Topbar title="选择家具风格" onBack={onBack} />
      <div className="mx-auto max-w-4xl px-4 py-5">
        <div className="mb-4 rounded-2xl bg-[#e8eee8] p-4 text-sm font-semibold leading-6 text-[#2e4a3d]">
          本步骤只生成家具、柜体、灯具、窗帘、地毯、挂画、绿植等可替换内容。
          墙面、天花、门窗和空间结构保持不变。
        </div>

        <button
          className={`mb-4 flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left ${
            selectedStyle === "custom"
              ? "border-[#2e4a3d] bg-[#fffcf5]"
              : "border-dashed border-[#e6ddc9] bg-[#fffcf5]"
          }`}
          type="button"
          onClick={customStyleUrl ? () => onSelectStyle("custom") : onUploadStyle}
        >
          <div
            className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-[#e8eee8] bg-cover bg-center text-[#2e4a3d]"
            style={{
              backgroundImage: customStyleUrl ? `url('${customStyleUrl}')` : undefined,
            }}
          >
            {!customStyleUrl && <CloudArrowUpIcon className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black">
              {customStyleUrl ? "我的参考图" : "上传我喜欢的图片"}
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-[#736a5a]">
              {customStyleUrl
                ? "已上传，将按这张图的家具软装风格生成"
                : "后面你发来的风格图会放进这里"}
            </div>
          </div>
          <button
            className="rounded-full bg-[#e8eee8] px-3 py-2 text-xs font-black text-[#2e4a3d]"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUploadStyle();
            }}
          >
            {customStyleUrl ? "更换" : "上传"}
          </button>
        </button>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {styleOptions.map((style) => (
            <button
              className={`overflow-hidden rounded-2xl border-2 bg-[#fffcf5] text-left shadow-[0_10px_30px_rgba(42,38,32,0.08)] transition ${
                selectedStyle === style.id
                  ? "border-[#2e4a3d]"
                  : "border-transparent hover:border-[#e6ddc9]"
              }`}
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
            >
              <div
                className="relative h-28 bg-cover bg-center"
                style={{ backgroundImage: `url('${style.image}')` }}
              >
                {selectedStyle === style.id && (
                  <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#2e4a3d] text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-black">{style.name}</div>
                <div className="mt-1 text-xs leading-5 text-[#736a5a]">
                  {style.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-5 bg-gradient-to-t from-[#f6f0e3] via-[#f6f0e3] to-transparent px-4 pb-5 pt-7 md:static md:bg-none md:px-0 md:pb-0">
          <button className="btn-primary w-full" type="button" onClick={onGenerate}>
            生成 2 个家具方案
          </button>
        </div>
      </div>
    </>
  );
}

function GeneratingView({ activeStep }: { activeStep: number }) {
  return (
    <div className="grid min-h-screen place-items-center px-8 text-center md:min-h-full">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-7 h-24 w-24 animate-spin rounded-full border-[6px] border-[#e8eee8] border-t-[#2e4a3d]" />
        <h2 className="font-serif text-xl font-bold">AI 正在生成方案</h2>
        <p className="mt-2 text-sm leading-6 text-[#736a5a]">
          正在锁定硬装结构，只替换家具、柜体与软装。
        </p>
        <div className="mt-8 grid gap-4 text-left">
          {generateSteps.map((step, index) => {
            const done = activeStep > index;
            const active = activeStep === index;

            return (
              <div
                className={`flex items-center gap-3 ${
                  active || done ? "text-[#2a2620]" : "text-[#9b927f]"
                }`}
                key={step}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                    active || done
                      ? "bg-[#2e4a3d] text-white"
                      : "bg-[#e6ddc9] text-[#736a5a]"
                  }`}
                >
                  {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
                </span>
                <span className="text-sm font-bold">{step}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#e6ddc9]">
          <div
            className="h-full rounded-full bg-[#2e4a3d] transition-all duration-500"
            style={{ width: `${((activeStep + 1) / generateSteps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ResultView({
  beforeImage,
  comparePct,
  currentPlan,
  favorite,
  resultTab,
  onBack,
  onCompare,
  onDownload,
  onRegenerate,
  onSave,
  onTab,
  onToggleFavorite,
}: {
  beforeImage: string;
  comparePct: number;
  currentPlan: { id: string; name: string; desc: string; image: string };
  favorite: boolean;
  resultTab: "A" | "B";
  onBack: () => void;
  onCompare: (value: number) => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  onTab: (tab: "A" | "B") => void;
  onToggleFavorite: () => void;
}) {
  return (
    <>
      <Topbar
        title="生成结果"
        onBack={onBack}
        right={
          <IconButton label="收藏方案" active={favorite} onClick={onToggleFavorite}>
            {favorite ? (
              <HeartSolidIcon className="h-5 w-5" />
            ) : (
              <HeartOutlineIcon className="h-5 w-5" />
            )}
          </IconButton>
        }
      />
      <div className="mx-auto max-w-4xl px-4 py-5">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["A", "B"] as const).map((tab) => (
            <button
              className={`rounded-full border px-4 py-3 text-sm font-black ${
                resultTab === tab
                  ? "border-[#2e4a3d] bg-[#2e4a3d] text-[#f6f0e3]"
                  : "border-[#e6ddc9] bg-[#fffcf5] text-[#736a5a]"
              }`}
              key={tab}
              type="button"
              onClick={() => {
                onTab(tab);
                onCompare(50);
              }}
            >
              方案 {tab}
            </button>
          ))}
        </div>

        <div className="relative h-[360px] overflow-hidden rounded-[20px] bg-black shadow-[0_10px_30px_rgba(42,38,32,0.12)] md:h-[560px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${beforeImage}')` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${currentPlan.image}')`,
              clipPath: `inset(0 0 0 ${comparePct}%)`,
            }}
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
            改造前
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
            改造后
          </span>
          <div
            className="absolute bottom-0 top-0 w-0 -translate-x-1/2 border-l-2 border-white"
            style={{ left: `${comparePct}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-black text-[#2a2620] shadow-lg">
              ⇔
            </span>
          </div>
          <input
            aria-label="前后对比滑杆"
            className="absolute inset-x-4 bottom-4 z-10 accent-[#2e4a3d]"
            type="range"
            min={4}
            max={96}
            value={comparePct}
            onChange={(event) => onCompare(Number(event.target.value))}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-[#f3e7cc] p-3 text-sm font-bold leading-6 text-[#7a5a22]">
          硬装结构已锁定：墙面、天花、门窗、梁柱和空间透视不参与替换。
        </div>

        <div className="mt-4">
          <h2 className="font-serif text-xl font-bold">
            方案 {resultTab} · {currentPlan.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#736a5a]">{currentPlan.desc}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button className="btn-secondary" type="button" onClick={onRegenerate}>
            <ArrowPathIcon className="h-5 w-5" />
            重新生成
          </button>
          <button className="btn-secondary" type="button" onClick={onDownload}>
            <ArrowDownTrayIcon className="h-5 w-5" />
            下载图片
          </button>
          <button className="btn-primary" type="button" onClick={onSave}>
            保存历史
          </button>
        </div>
      </div>
    </>
  );
}

function InspirationView({
  favorites,
  onFavorite,
  onSelect,
}: {
  favorites: string[];
  onFavorite: (id: string) => void;
  onSelect: (item: (typeof inspirationItems)[number]) => void;
}) {
  return (
    <>
      <Topbar title="灵感" />
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {["全部", "奶油风", "原木风", "现代简约", "中古风"].map((tag, index) => (
            <button
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${
                index === 0
                  ? "border-[#2e4a3d] bg-[#2e4a3d] text-[#f6f0e3]"
                  : "border-[#e6ddc9] bg-[#fffcf5] text-[#736a5a]"
              }`}
              key={tag}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {inspirationItems.map((item) => {
            const favorite = favorites.includes(item.id);

            return (
              <article
                className="overflow-hidden rounded-2xl bg-[#fffcf5] shadow-[0_10px_30px_rgba(42,38,32,0.08)]"
                key={item.id}
              >
                <div className="relative">
                  <button
                    className="block h-48 w-full bg-cover bg-center text-left"
                    style={{ backgroundImage: `url('${item.image}')` }}
                    type="button"
                    onClick={() => onSelect(item)}
                  />
                  <button
                    aria-label="收藏灵感"
                    className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full ${
                      favorite ? "bg-white text-[#b98a46]" : "bg-black/40 text-white"
                    }`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onFavorite(item.id);
                    }}
                  >
                    {favorite ? (
                      <HeartSolidIcon className="h-5 w-5" />
                    ) : (
                      <HeartOutlineIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="p-3">
                  <span className="rounded-full bg-[#f3e7cc] px-2 py-1 text-[11px] font-black text-[#b98a46]">
                    {item.tag}
                  </span>
                  <h3 className="mt-2 text-sm font-black">{item.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#736a5a]">{item.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}

function HistoryView({
  items,
  onOpen,
}: {
  items: HistoryItem[];
  onOpen: () => void;
}) {
  return (
    <>
      <Topbar title="历史" />
      <div className="mx-auto max-w-3xl px-4 py-5">
        {items.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-[#736a5a]">
            还没有生成记录。
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <button
                className="flex items-center gap-3 rounded-2xl bg-[#fffcf5] p-3 text-left shadow-[0_10px_30px_rgba(42,38,32,0.08)]"
                key={item.id}
                type="button"
                onClick={onOpen}
              >
                <div
                  className="h-20 w-20 flex-none rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url('${item.image}')` }}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{item.name}</div>
                  <div className="mt-1 text-xs font-semibold text-[#736a5a]">
                    {item.time} · {item.count} 个方案
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProfileView({
  favoriteCount,
  historyCount,
  onHistory,
  onSoon,
}: {
  favoriteCount: number;
  historyCount: number;
  onHistory: () => void;
  onSoon: (message: string) => void;
}) {
  return (
    <>
      <Topbar title="我的" />
      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#e8eee8] text-xl font-black text-[#2e4a3d]">
            游
          </div>
          <div>
            <div className="font-serif text-xl font-bold">游客用户</div>
            <div className="mt-1 text-sm text-[#736a5a]">
              登录和云同步后面再接。
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <ProfileRow
            icon={<ClockIcon className="h-5 w-5" />}
            label="历史生成"
            meta={`${historyCount} 条记录`}
            onClick={onHistory}
          />
          <ProfileRow
            icon={<HeartOutlineIcon className="h-5 w-5" />}
            label="收藏风格"
            meta={`${favoriteCount} 个收藏`}
            onClick={() => onSoon("收藏详情后面接风格库")}
          />
          <ProfileRow
            icon={<ArchiveBoxIcon className="h-5 w-5" />}
            label="空间档案"
            meta="后面保存不同房间"
            onClick={() => onSoon("空间档案功能后面接账号")}
          />
          <ProfileRow
            icon={<WrenchScrewdriverIcon className="h-5 w-5" />}
            label="硬装模式"
            meta="已禁用"
            onClick={() => onSoon("当前产品定位不开放硬装替换")}
          />
        </div>
      </div>
    </>
  );
}

function ProfileRow({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center justify-between rounded-2xl bg-[#fffcf5] p-4 text-left shadow-[0_10px_30px_rgba(42,38,32,0.08)]"
      type="button"
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8eee8] text-[#2e4a3d]">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black">{label}</span>
          <span className="mt-1 block text-xs font-semibold text-[#736a5a]">
            {meta}
          </span>
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 flex-none text-[#736a5a]" />
    </button>
  );
}

function MobileTabs({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const items = [
    { id: "home" as Page, label: "首页", icon: HomeIcon },
    { id: "inspiration" as Page, label: "灵感", icon: SparklesIcon },
    { id: "history" as Page, label: "历史", icon: ClockIcon },
    { id: "profile" as Page, label: "我的", icon: UserIcon },
  ];

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 grid h-[78px] grid-cols-4 border-t border-[#e6ddc9] bg-[#fffcf5]/95 pb-3 backdrop-blur md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = page === item.id;

        return (
          <button
            className={`grid place-items-center content-center gap-1 text-[11px] font-bold ${
              active ? "text-[#2e4a3d]" : "text-[#736a5a]"
            }`}
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            <Icon className="h-6 w-6" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
