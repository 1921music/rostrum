// +skip
import { css } from './common.js';
// -skip

// Shared visual language. Geometry and gesture behavior stay in each widget;
// this layer is loaded after their styles in both source and packaged builds.
css('Appearance', `
  :root, :root[data-theme=Light], :root[data-theme=Glass] {
    --ui-bg:#fff; --ui-surface:#f5f7fa; --ui-line:#e5e9f0;
    --ui-text:#202938; --ui-muted:#687488; --ui-primary:#245cce;
    --ui-selected:#eaf1ff; --ui-hover:#f0f3f8; --ui-on-primary:#fff;
    --ui-font:system-ui,-apple-system,"Segoe UI",sans-serif;
    --body-font-family:var(--ui-font); --body-letter-spacing:0; --body-line-height:1.4;
    --body-color:var(--ui-text); --bodyColor:var(--ui-surface); --bodyVignette:none;
    --panTexture:none; --textShadow:none; --text-shadow-contrast:none; --file-text-shadow:none;
    --color-primary:var(--ui-primary); --color-primary-active:#1748ac;
    --color-surface:var(--ui-surface); --color-surface-selected:var(--ui-selected);
    --color-accent:var(--ui-primary); --color-text:var(--ui-text);
    --color-text-secondary:var(--ui-muted); --color-text-muted:#768198;
    --color-border:var(--ui-line); --color-border-light:var(--ui-line);
    --color-background-overlay:#ffffffed; --file-properties-color:var(--ui-muted);
    --borderRadius:.55em; --border:1px solid var(--ui-line);
    --panel-bg:var(--ui-bg); --panel-header-bg:var(--ui-bg);
    --panel-header-selected-bg:var(--ui-selected); --panel-inset-shadow:none;
    --panelShadow:none; --bodyShadow:none;
    --menu-cell-bg:var(--ui-bg); --menu-cell-selected-bg:var(--ui-hover);
    --menu-cell-active-bg:var(--ui-selected); --menu-disk-bg:var(--ui-surface);
    --menu-grip-bg:var(--ui-primary); --menu-grip-selected-bg:#1748ac;
    --menu-icon-color:var(--ui-text); --menu-panel-indicator:var(--ui-muted);
    --menu-panel-indicator-highlight:transparent; --menu-panel-indicator-shadow:transparent;
    --menu-cell-box-shadow:none; --menu-grip-box-shadow:none; --menu-disk-shadow:none;
    --menu-grip-shadow:none; --menu-drawer-front:var(--ui-bg);
    --slider-indicator:var(--ui-on-primary); --slider-indicator-active:var(--ui-on-primary);
    --slider-knob-bg:var(--ui-primary); --slider-knob-selected-bg:var(--ui-primary); --slider-knob-shadow:none;
    --select-option-bg:var(--ui-bg); --select-option-text:var(--ui-text);
  }
  :root[data-theme=Dark] {
    --ui-bg:#151c28; --ui-surface:#1c2533; --ui-line:#303b4e;
    --ui-text:#e7edf7; --ui-muted:#a2aec2; --ui-primary:#a4c2ff;
    --ui-selected:#263b5e; --ui-hover:#243044; --ui-on-primary:#152642;
    --body-font-family:var(--ui-font); --body-letter-spacing:0; --body-line-height:1.4;
    --body-color:var(--ui-text); --bodyColor:#111722; --bodyVignette:none;
    --panTexture:none; --textShadow:none; --text-shadow-contrast:none; --file-text-shadow:none;
    --color-primary:var(--ui-primary); --color-primary-active:#c3d7ff;
    --color-surface:var(--ui-surface); --color-surface-selected:var(--ui-selected);
    --color-accent:var(--ui-primary); --color-text:var(--ui-text);
    --color-text-secondary:var(--ui-muted); --color-text-muted:#8d9bb2;
    --color-border:var(--ui-line); --color-border-light:var(--ui-line);
    --color-background-overlay:#151c28ed; --file-properties-color:var(--ui-muted);
    --panel-bg:var(--ui-bg); --panel-header-bg:var(--ui-bg);
    --panel-header-selected-bg:var(--ui-selected); --panel-inset-shadow:none;
    --panelShadow:none; --bodyShadow:none;
    --menu-cell-bg:var(--ui-bg); --menu-cell-selected-bg:var(--ui-hover);
    --menu-cell-active-bg:var(--ui-selected); --menu-disk-bg:var(--ui-surface);
    --menu-grip-bg:var(--ui-primary); --menu-grip-selected-bg:#c3d7ff;
    --menu-icon-color:var(--ui-text); --menu-panel-indicator:var(--ui-muted);
    --menu-panel-indicator-highlight:transparent; --menu-panel-indicator-shadow:transparent;
    --menu-cell-box-shadow:none; --menu-grip-box-shadow:none; --menu-disk-shadow:none; --menu-grip-shadow:none;
    --menu-drawer-front:var(--ui-bg); --slider-indicator:var(--ui-on-primary);
    --slider-indicator-active:var(--ui-on-primary); --slider-knob-bg:var(--ui-primary);
    --slider-knob-selected-bg:var(--ui-primary); --slider-knob-shadow:none;
    --select-option-bg:var(--ui-bg); --select-option-text:var(--ui-text);
    color-scheme:dark;
  }
  :root[data-theme=Glass] { --menu-cell-bg:#ffffffeb; --menu-disk-bg:#f5f7fae8; --panel-bg:#fffffff5; }
  :root .Menu { font-family:var(--ui-font); line-height:1.2; letter-spacing:0; }
  :root .Menu__holder { background:var(--ui-line); box-shadow:0 4px 24px #172b4d26; }
  :root .Menu__disk { background:var(--ui-line); }
  :root .Menu__cell-active, :root .Menu__diskCell-active { color:var(--ui-primary); }
  :root .Menu__cell-disabled { color:var(--color-text-muted); }
  :root .Menu__cell-contents > [data-tag=cellName] { max-width:8em; margin-inline:auto; line-height:1.1; }
  :root .Menu__grip { border:2px solid var(--ui-bg); }
  :root .Menu__grip::after { content:'⠿'; display:grid; place-items:center; position:absolute; inset:0; color:var(--ui-on-primary); pointer-events:none; font-size:1em; }
  :root .Menu__cell-panel::after { box-shadow:none; }
  :root .Panel { font-family:var(--ui-font); letter-spacing:0; line-height:1.4; }
  :root .Panel .Panel__elm { border:1px solid var(--ui-line); border-radius:12px; background:var(--panel-bg); box-shadow:0 3px 14px #172b4d14; }
  :root .Panel .Panel__header { background-image:none; border-bottom:1px solid var(--ui-line); cursor:grab; }
  :root .Panel .Panel__header-selected { cursor:grabbing; }
  :root .Panel .Panel__title { font-weight:600; padding:0 3em; box-sizing:border-box; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  :root .Panel .Panel__body { max-height:calc(100dvh - 5em); overflow:auto; scrollbar-width:thin; }
  :root .Panel .Panel__item { margin-top:1em; }
  :root .Panel .MenuGroup__section { border-color:var(--ui-line); padding-top:16px; margin-top:16px; }
  :root .Panel .MenuGroup__section h3 { font-weight:600; margin-bottom:12px; }
  :root .Panel :is(input:not([type=checkbox]):not([type=range]):not([type=color]),select),
  :root dialog:not(.LibraryWindow) :is(input:not([type=checkbox]):not([type=range]):not([type=color]),select) {
    font-family:var(--ui-font); color:var(--ui-text); background:var(--ui-bg);
    border:1px solid var(--ui-line); border-radius:8px; padding:.5em .65em; min-height:2.6em; box-sizing:border-box;
  }
  :root .Panel input[type=checkbox], :root dialog input[type=checkbox], :root .PlaybackBar input { accent-color:var(--ui-primary); }
  :root .Panel :is(button,input,select):focus-visible, :root dialog :is(button,input,select):focus-visible {
    outline:2px solid var(--ui-primary); outline-offset:3px;
  }
  :root .Panel button:not(.ButtonGroup__button), :root dialog button:not(.ButtonGroup__button), :root .PlaybackBar button {
    font:inherit; border:1px solid var(--ui-line); border-radius:8px;
    color:var(--ui-text); background:var(--ui-bg); padding:.5em .8em; min-height:2.6em; cursor:pointer;
  }
  :root .Panel button:hover, :root dialog button:hover, :root .PlaybackBar button:hover { background:var(--ui-hover); }
  :root .Panel button:disabled, :root dialog button:disabled { opacity:.45; cursor:default; }
  :root .Panel button.Panel__closer { border:0; padding:0; min-height:0; font:inherit; background:transparent; display:grid; place-items:center; border-radius:50%; cursor:pointer; }
  :root .Panel .Panel__closer svg { pointer-events:none; }
  :root .Panel .Panel__closer:hover { background:var(--ui-hover); }
  :root .ButtonGroup { gap:.45em; flex-wrap:wrap; align-items:stretch; }
  :root .ButtonGroup__button {
    font-family:var(--ui-font); font-weight:500; font-size:.875em; line-height:1.25;
    width:auto; min-width:3.8em; max-width:10em; height:auto; min-height:3.8em;
    padding:.55em .6em; border:1px solid var(--ui-line); border-radius:8px;
    background:var(--ui-bg); color:var(--ui-text); white-space:normal; cursor:pointer;
  }
  :root .ButtonGroup__button:hover { background:var(--ui-hover); }
  :root .ButtonGroup__button-active, :root .ButtonGroup__button-selected { box-shadow:none; border-color:var(--ui-primary); color:var(--ui-primary); background:var(--ui-selected); }
  :root .ButtonGroup__button:disabled { opacity:.4; cursor:default; }
  :root .ButtonGroup__button:focus-visible { outline:2px solid var(--ui-primary); outline-offset:3px; }
  :root .ButtonGroup__button-toggle { background-image:none; }
  :root .ButtonGroup__icon { margin-top:.25em; }
  :root .Slider__track { height:.3em; top:calc(50% - .15em); border-radius:1em; background:linear-gradient(to right,var(--ui-primary) var(--slider-progress,0%),var(--ui-line) var(--slider-progress,0%)); }
  :root .Slider__knob { background:transparent; background-image:none; box-shadow:none; border-radius:50%; }
  :root .Slider__knob::before { content:''; position:absolute; inset:.6em; border-radius:50%; background:var(--ui-primary); box-shadow:0 1px 3px #172b4d30; }
  :root .Slider__knob-selected::before { box-shadow:0 0 0 .35em var(--ui-selected); }
  :root .Slider__knob__indicator { z-index:1; width:.3em; height:.3em; top:calc(50% - .15em); left:calc(50% - .15em); background:var(--ui-on-primary); }
  :root .SliderGroup__SliderBlock { padding:.2em 0; }
  :root .Select__toggle { font-family:var(--ui-font); border:1px solid var(--ui-line); border-radius:8px; background:var(--ui-bg); color:var(--ui-text); padding:0 2em 0 .6em; }
  :root .Select__toggle:focus { background:var(--ui-bg); outline:2px solid var(--ui-primary); outline-offset:2px; }
  :root .Select__toggle::after { content:''; width:.4em; height:.4em; border-right:2px solid var(--ui-muted); border-bottom:2px solid var(--ui-muted); background:none; clip-path:none; rotate:45deg; top:calc(50% - .3em); left:auto; right:.8em; box-shadow:none; }
  :root .Select__frame { background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:8px; box-shadow:0 8px 24px #172b4d20; color:var(--ui-text); }
  :root .Select__sash { color:var(--ui-text); font-family:var(--ui-font),Bravura; }
  :root .Tab__tag { border-radius:8px; color:var(--ui-muted); cursor:pointer; }
  :root .Tab__tag-selected { background:var(--ui-selected); color:var(--ui-primary); font-weight:600; }
  :root .TabView__sash { background:var(--ui-bg); background-image:none; border-bottom:1px solid var(--ui-line); }
  :root .Flv:focus { background:var(--ui-bg); }
  :root .Flv-list__file { border-bottom:1px solid var(--ui-line); border-radius:6px; }
  :root .Flv-path__sash { background:var(--ui-surface); background-image:none; }
  :root .Local { margin:1em; padding:1em; border:1px dashed var(--ui-line); border-radius:12px; background:var(--ui-surface); cursor:pointer; }
  :root .Local__line { margin-top:1em; }
  :root .Surface__outline { border:1px solid var(--ui-line); background:var(--ui-surface); border-radius:10px; }
  :root .Keyboard__key { background:var(--ui-bg); border-color:var(--ui-line); color:var(--ui-text); border-radius:6px; }
  :root .Keyboard__key.mod { background:var(--ui-surface); }
  :root .Keyboard__key.pressed { background:var(--ui-selected); color:var(--ui-primary); }
  :root .Pz__control { stroke:var(--ui-muted); }
  :root .Pz__control-active { color:var(--ui-primary); }
  :root .Piano__key-white { background:#fff; border-color:#d8dee9; box-shadow:0 2px 2px #172b4d14; }
  :root .Piano__key-black { background:#202938; border-color:#151c28; box-shadow:0 2px 3px #172b4d30; }
  :root .Piano__key-white.pressed, :root .Piano__key-white:active { background:#d8e7ff; box-shadow:none; }
  :root .Piano__key-black.pressed, :root .Piano__key-black:active { background:#245cce; box-shadow:none; }
  :root [data-tag=PianoPanel] .Panel__header { height:6em; }
  :root .Piano__button-holder { top:2.5em; }
  :root .Piano__options { top:6.125em; }
  :root .Piano__button { fill:currentColor; color:var(--ui-text); background:var(--ui-surface); }
  :root .Piano__button-active { color:var(--ui-primary); background:var(--ui-selected); }
  :root .Piano__options { filter:none; border:1px solid var(--ui-line); box-shadow:0 4px 16px #172b4d20; }
  :root .PlaybackBar, :root .PlaybackMixer { border:1px solid var(--ui-line); border-radius:12px; box-shadow:0 3px 12px #172b4d14; font-family:var(--ui-font); }
  :root .PlaybackMixer { padding:16px; }
  :root .ScoreImportReview { font-family:var(--ui-font); border:1px solid var(--ui-line); border-radius:16px; padding:24px; background:var(--ui-bg); color:var(--ui-text); }
  :root .ScoreImportReview fieldset { border:1px solid var(--ui-line); border-radius:10px; padding:16px; }
  :root .ScoreImportReview fieldset[data-current=true] { border-color:var(--ui-primary); background:var(--ui-selected); }
  :root .ScoreImportReview__page { background:var(--ui-surface); border-radius:10px; }
  :root dialog.dialog { font:15px/1.5 var(--ui-font); color:var(--ui-text); background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:16px; width:min(460px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); box-sizing:border-box; padding:24px; text-align:left; box-shadow:0 12px 44px #172b4d30; }
  :root dialog::backdrop { background:#15264266; backdrop-filter:blur(2px); }
  :root dialog.dialog .ButtonGroup { justify-content:flex-end; margin-top:24px; }
  :root dialog.dialog .ButtonGroup__button { min-height:40px; min-width:80px; max-width:none; padding:10px 16px; font-size:14px; }
  :root dialog.dialog .ButtonGroup__icon { display:none; }
  :root dialog.dialog .UiAction--primary { background:var(--ui-primary); color:var(--ui-on-primary); border-color:transparent; }
  :root .dialog__textInput { font-size:15px; min-height:42px; padding:10px 12px; border:1px solid var(--ui-line); border-radius:8px; background:var(--ui-bg); color:var(--ui-text); }
  :root .floatingMsg { font:14px/1.4 var(--ui-font); filter:none; background:var(--ui-bg); background-image:none; color:var(--ui-text); border:1px solid var(--ui-line); border-radius:10px; padding:12px 18px; box-shadow:0 3px 14px #172b4d14; max-width:calc(100vw - 32px); box-sizing:border-box; overflow-wrap:anywhere; }
  :root #toast .floatingMsg { color:#fff; background:#202938; border:0; }
  :root .Shade { background:#15264233; backdrop-filter:blur(2px); }
  :root .Shade__body { animation:none; color:var(--ui-primary); background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:16px; padding:24px; }
  :root .Shade__body [data-tag=msg] { font:15px/1.5 var(--ui-font); color:var(--ui-text); margin:12px 0; }
  :root .Shade__body button { font:14px var(--ui-font); padding:10px 16px; border:1px solid var(--ui-line); background:var(--ui-bg); color:var(--ui-text); border-radius:8px; }
  @media(prefers-reduced-motion:reduce) { :root .Menu__holder, :root .Panel__elm { transition-duration:0ms; } }
`);
