/**
 * dsh-weixin-channel 浏览器端：微信频道设置页 + 工作区频道槽。
 */
window.__ModuleLoader__.load({
  id: "@cubeai/dsh-weixin-channel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, useSyncExternalStore } = React;
    let ReactDOM = {};
    try { ReactDOM = require("react-dom"); } catch { /* react-dom is optional; SVG markup degrades gracefully */ }
    const primitives = typeof require === "function" ? (function () { try { return require("@deepseek-ai/dsh-client-ui-primitives"); } catch { return {}; } })() : {};
    const PrimitiveButton = primitives.Button;
    const HostMenu = primitives.Menu || function FallbackMenu(props) {
      const items = Array.isArray(props.items) ? props.items : [];
      const footer = Array.isArray(props.footer) ? props.footer : [];
      const option = (item) => React.createElement("button", {
        key: String(item.value),
        type: "button",
        role: "option",
        disabled: item.disabled,
        "aria-selected": props.selectedId !== undefined && String(item.value) === String(props.selectedId),
        style: {
          display: "block",
          width: "100%",
          padding: "6px 8px",
          border: 0,
          borderRadius: 6,
          background: props.selectedId !== undefined && String(item.value) === String(props.selectedId) ? "var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06))" : "transparent",
          color: "var(--dsw-alias-label-primary, inherit)",
          textAlign: "left",
          cursor: item.disabled ? "not-allowed" : "pointer",
          opacity: item.disabled ? 0.5 : 1,
        },
        onClick: () => {
          if (item.disabled) return;
          props.onSelect?.(item.value);
          props.onClose?.();
        },
      }, item.label);
      return React.createElement("div", { className: "dwc-fallback-menu-wrap", style: { position: "relative", display: "inline-flex", width: "100%" } },
        props.anchor,
        props.open && React.createElement("div", {
          className: ["dwc-form-menu", props.listClassName].filter(Boolean).join(" "),
          role: "listbox",
          style: {
            position: "absolute",
            zIndex: 1200,
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            maxHeight: 280,
            overflow: "auto",
            background: "var(--dsw-alias-bg-layer-2, #fff)",
            border: "1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12))",
            borderRadius: 8,
            padding: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
          },
        }, items.map(option), footer.map(option)));
    };
    const HostModal = primitives.Modal;
    const HostSegmentedTabs = primitives.SegmentedTabs || function FallbackSegmentedTabs(props) {
      return React.createElement("div", {
        className: [props.className, "dwc-tabs"].filter(Boolean).join(" "),
        role: "tablist",
        "aria-label": props.label,
      }, (props.items || []).map((item) => React.createElement("button", {
        key: item.value,
        type: "button",
        role: "tab",
        "aria-selected": item.value === props.value,
        className: item.value === props.value ? "dwc-tab on" : "dwc-tab",
        onClick: () => props.onChange(item.value),
      }, item.label)));
    };
    // 宿主 Button 由 forwardRef 包成对象，typeof 是 object，不是 function。
    function isHostComponent(component) {
      return typeof component === "function" || (!!component && typeof component === "object" && typeof component.render === "function");
    }
    // 只关最上层。下层监听先注册，不是顶层就放行，避免一次 Escape 关掉弹窗和宿主设置。
    const modalLayers = [];
    // 0.1.7 把尺寸从图标名里拿掉了（IconEditOutlineRegular）。旧宿主仍导出 *16/*20。
    function pickHostIcon(...names) {
      for (const name of names) {
        const icon = primitives[name];
        if (typeof icon === "function") return icon;
      }
      return function MissingHostIcon() { return null; };
    }
    const IconFolderClose = pickHostIcon("IconFolderCloseRegular", "IconFolderClose16", "IconFolderClose");
    const IconClockOutline = pickHostIcon("IconClockOutlineRegular", "IconClockOutline16");
    const IconQueueOutline = pickHostIcon("IconQueueOutlineRegular");
    const IconCheckOutline = pickHostIcon("IconCheckOutlineRegular");
    const IconCheckCircleOutline = pickHostIcon("IconCheckCircleOutlineRegular");
    const IconCloseCircleFill = pickHostIcon("IconCloseCircleFillRegular");
    const IconInfoOutline = pickHostIcon("IconInfoOutlineRegular");
    const IconWarningOutline = pickHostIcon("IconWarningOutlineRegular");
    const IconCloseFill = pickHostIcon("IconCloseFillRegular");
    const IconChevronDownOutline = pickHostIcon("IconChevronDownOutlineRegular");
    const IconChevronRightOutline = pickHostIcon("IconChevronRightOutlineRegular");
    const IconPlusOutline = pickHostIcon("IconPlusOutlineRegular");
    const IconEditOutline = pickHostIcon("IconEditOutlineRegular");
    const IconRefreshOutline = pickHostIcon("IconRefreshOutlineRegular");
    const IconDownloadOutline = pickHostIcon("IconDownloadOutlineRegular");
    const IconCopyOutline = pickHostIcon("IconCopyOutlineRegular");
    const IconLoadingOutline = pickHostIcon("IconLoadingOutlineRegular");
    const IconStopFill = pickHostIcon("IconStopFillRegular", "IconStopFill16", "IconStopFill");
    function alertIcon(type) {
      if (type === "success") return h(IconCheckCircleOutline, { size: 14 });
      if (type === "warning") return h(IconWarningOutline, { size: 14 });
      if (type === "error") return h(IconCloseCircleFill, { size: 14 });
      return h(IconInfoOutline, { size: 14 });
    }
    function NoticeBar({ type = "info", icon, children, className, role, showIcon }) {
      const iconNode = icon !== undefined ? icon : (showIcon !== false ? alertIcon(type) : null);
      return React.createElement("div", {
        role: role || (type === "error" ? "alert" : undefined),
        className: ["dwc-feedback", "dwc-feedback-" + type, className].filter(Boolean).join(" "),
      },
        iconNode && React.createElement("span", { className: "dwc-feedback-icon" }, iconNode),
        React.createElement("div", { className: "dwc-feedback-body" }, children)
      );
    }
    function Tag({ color, children, icon, className, bordered, ...props }) {
      const colorCls = color ? "dwc-tag-" + color : "";
      return React.createElement("span", {
        ...props,
        className: ["dwc-tag", colorCls, className].filter(Boolean).join(" "),
      }, icon && React.createElement("span", { className: "dwc-tag-icon", style: { display: "inline-flex", alignItems: "center", marginRight: children ? 4 : 0 } }, icon), children);
    }
    function Input(props) {
      const { className, type = "text", ...rest } = props;
      return React.createElement("input", {
        type,
        ...rest,
        className: ["dwc-input", className].filter(Boolean).join(" "),
      });
    }
    function TextArea(props) {
      const { autoSize, className, rows, ...rest } = props;
      return React.createElement("textarea", {
        ...rest,
        className: ["dwc-input dwc-textarea", className].filter(Boolean).join(" "),
        rows: autoSize?.minRows || rows || 4,
      });
    }
    Input.TextArea = TextArea;
    function Checkbox({ checked, onChange, children, className, disabled, ...props }) {
      return React.createElement("label", {
        className: ["dwc-checkbox-label", disabled ? "is-disabled" : "", className].filter(Boolean).join(" "),
      },
        React.createElement("input", {
          type: "checkbox",
          checked: Boolean(checked),
          disabled,
          onChange,
          className: "dwc-checkbox",
          ...props,
        }),
        children ? React.createElement("span", { className: "dwc-checkbox-text" }, children) : null
      );
    }
    function hostModalButton(label, onClick, kind, extra) {
      const options = extra || {};
      const isDanger = kind === "danger" || options.danger;
      const variant = isDanger ? "outline" : (kind === "primary" ? "primary" : "outline");
      const dangerClass = isDanger ? "dwc-btn-danger" : "";
      const className = [options.className, dangerClass].filter(Boolean).join(" ") || undefined;
      if (isHostComponent(PrimitiveButton)) {
        return React.createElement(PrimitiveButton, {
          variant,
          disabled: options.disabled,
          className,
          onClick,
          type: "button",
        }, label);
      }
      return React.createElement(Button, {
        variant,
        disabled: options.disabled,
        className,
        onClick,
      }, label);
    }
    function Modal(props) {
      const { open, title, onCancel, onOk, okText, cancelText, okButtonProps, confirmLoading, width = 640, zIndex = 1100, children, footer, className, contentClassName, keyboard, maskClosable, closeLabel, description } = props;
      const requestClose = onCancel || props.onClose;
      const closeRef = useRef(requestClose);
      closeRef.current = requestClose;
      const layerRef = useRef(null);
      if (!layerRef.current) layerRef.current = { owner: props.layerOwner || "modal" };
      useEffect(() => {
        if (!open) return undefined;
        const layer = layerRef.current;
        modalLayers.push(layer);
        const onKey = (event) => {
          if (event.key !== "Escape") return;
          if (modalLayers[modalLayers.length - 1] !== layer) return;
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
          if (keyboard === false) return;
          if (closeRef.current) closeRef.current();
        };
        window.addEventListener("keydown", onKey, true);
        return () => {
          window.removeEventListener("keydown", onKey, true);
          const index = modalLayers.lastIndexOf(layer);
          if (index >= 0) modalLayers.splice(index, 1);
        };
      }, [open, keyboard]);
      if (!open) return null;
      const handleClose = () => { if (closeRef.current) closeRef.current(); };
      const handleOk = () => { if (onOk) onOk(); };
      const actionRow = footer === null ? null : (footer || React.createElement(React.Fragment, null,
        hostModalButton(cancelText || "取消", handleClose, "outline"),
        hostModalButton(okText || "确定", handleOk, okButtonProps?.danger ? "danger" : "primary", { disabled: okButtonProps?.disabled || confirmLoading, danger: okButtonProps?.danger })
      ));
      const footerNode = Array.isArray(actionRow)
        ? React.createElement(React.Fragment, null, actionRow)
        : actionRow;
      const hostDescription = typeof description === "string" && description !== "" ? { description } : {};
      if (typeof HostModal === "function") {
        return h(HostModal, {
          open: true,
          title,
          onClose: handleClose,
          closeLabel: closeLabel || "Close",
          className,
          // 宿主 Modal 把内容区裁在视口内；标记 content 区，让它在超长时滚动。
          contentClassName: ["dwc-modal-content", contentClassName].filter(Boolean).join(" "),
          footer: footerNode,
          ...hostDescription,
        }, children);
      }
      const allowMask = maskClosable !== false && modalLayers[modalLayers.length - 1] === layerRef.current;
      return React.createElement("div", { className: "dwc-modal-root", style: { zIndex } },
        React.createElement("div", { className: "dwc-modal-mask", onClick: allowMask ? handleClose : undefined }),
        React.createElement("div", { className: ["dwc-modal-wrap", className].filter(Boolean).join(" ") },
          React.createElement("div", { className: "dwc-modal-panel", style: { width } },
            React.createElement("div", { className: "dwc-modal-header" },
              React.createElement("div", { className: "dwc-modal-title" }, title),
              React.createElement("button", { type: "button", className: "dwc-modal-close", "aria-label": closeLabel || "Close", onClick: handleClose },
                h(IconCloseFill, { size: 14 })
              )
            ),
            React.createElement("div", { className: "dwc-modal-body" },
              description ? React.createElement("p", { className: "dwc-confirm-content" }, description) : null,
              children),
            footerNode && React.createElement("div", { className: "dwc-modal-footer-wrap" }, footerNode)
          )
        )
      );
    }
    function useModal() {
      const [config, setConfig] = React.useState(null);
      const confirm = (opts) => { setConfig(opts); };
      const holder = config ? React.createElement(Modal, {
        open: true,
        title: config.title,
        width: 480,
        description: config.description,
        onCancel: () => { setConfig(null); },
        onOk: () => {
          const p = config.onOk?.();
          if (p && typeof p.then === "function") {
            p.then(() => setConfig(null));
          } else {
            setConfig(null);
          }
        },
        okText: config.okText,
        cancelText: config.cancelText,
        okButtonProps: config.okButtonProps,
      }, config.content ? React.createElement("p", { className: "dwc-confirm-content" }, config.content) : null) : null;
      return [{ confirm }, holder];
    }
    Modal.useModal = useModal;
    function Switch(props) {
      const on = Boolean(props.checked);
      return React.createElement("button", {
        type: "button",
        role: "switch",
        "aria-checked": on,
        "aria-label": props["aria-label"],
        title: props.title,
        disabled: props.disabled,
        className: "dwc-enable-switch" + (props.className ? " " + props.className : ""),
        onClick: function (event) {
          if (event && typeof event.stopPropagation === "function") event.stopPropagation();
          if (!props.disabled && props.onChange) props.onChange(!on);
        },
      }, React.createElement("span", { className: "dwc-enable-switch-thumb", "aria-hidden": "true" }));
    }
    function Select(props) {
      const [open, setOpen] = useState(false);
      const rootRef = useRef(null);

      useEffect(() => {
        if (!open) return undefined;
        const updateWidth = () => {
          const width = rootRef.current?.getBoundingClientRect().width ?? 0;
          if (width > 0) document.documentElement.style.setProperty("--dwc-menu-width", `${Math.round(width)}px`);
        };
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => {
          window.removeEventListener("resize", updateWidth);
          document.documentElement.style.removeProperty("--dwc-menu-width");
        };
      }, [open]);

      useEffect(() => {
        if (!open || typeof window === "undefined") return undefined;
        const layer = { owner: "select" };
        modalLayers.push(layer);
        function onKey(event) {
          if (event.key !== "Escape") return;
          if (modalLayers[modalLayers.length - 1] !== layer) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          setOpen(false);
        }
        window.addEventListener("keydown", onKey, true);
        return () => {
          window.removeEventListener("keydown", onKey, true);
          const index = modalLayers.lastIndexOf(layer);
          if (index >= 0) modalLayers.splice(index, 1);
        };
      }, [open]);

      const items = React.useMemo(() => {
        const list = [];
        (props.options || []).forEach((opt, idx) => {
          if (Array.isArray(opt.options)) {
            list.push({ type: "label", id: "group-" + idx, text: opt.label || "" });
            opt.options.forEach((sub) => {
              list.push({ id: String(sub.value), label: sub.label, disabled: sub.disabled, danger: sub.danger });
            });
          } else {
            list.push({ id: String(opt.value), label: opt.label, disabled: opt.disabled, danger: opt.danger });
          }
        });
        return list;
      }, [props.options]);

      const footer = React.useMemo(() => {
        if (!Array.isArray(props.footer) || props.footer.length === 0) return undefined;
        return props.footer.map((item) => ({
          id: String(item.value),
          label: item.label,
          disabled: item.disabled,
          danger: item.danger,
        }));
      }, [props.footer]);

      const selectedOption = React.useMemo(() => {
        for (const opt of props.options || []) {
          if (Array.isArray(opt.options)) {
            const found = opt.options.find((sub) => String(sub.value) === String(props.value));
            if (found) return found;
          } else if (String(opt.value) === String(props.value)) {
            return opt;
          }
        }
        return null;
      }, [props.options, props.value]);

      const currentText = selectedOption ? selectedOption.label : (props.placeholder || props["aria-label"] || "");

      return React.createElement("div", {
        ref: rootRef,
        className: "dwc-menu-select-wrap " + (props.className || ""),
        style: props.style,
      },
        React.createElement(HostMenu, {
          open: open,
          listClassName: ["dwc-form-menu", props.listClassName].filter(Boolean).join(" "),
          onClose: () => setOpen(false),
          onSelect: (id) => {
            if (props.footer && props.footer.some((item) => String(item.value) === id)) {
              if (typeof props.onFooter === "function") props.onFooter(id);
              setOpen(false);
              return;
            }
            if (props.onChange) props.onChange(id);
            setOpen(false);
          },
          selectedId: props.value != null ? String(props.value) : undefined,
          align: "start",
          portal: true,
          dense: true,
          anchor: React.createElement(Button, {
            variant: "outline",
            size: "sm",
            role: "combobox",
            "aria-label": props["aria-label"] || props.placeholder,
            "aria-expanded": open,
            disabled: props.disabled,
            className: "dwc-menu-select-trigger" + (open ? " is-open" : ""),
            onClick: () => { if (!props.disabled) setOpen((prev) => !prev); },
          },
            React.createElement("span", { className: "dwc-menu-select-label" }, currentText),
            h(IconChevronDownOutline, {
              size: 12,
              className: "dwc-menu-select-arrow",
              style: { marginLeft: 4, transition: "transform 150ms ease", transform: open ? "rotate(180deg)" : "none" },
            })
          ),
          items: items,
          ...(footer ? { footer } : {}),
        })
      );
    }
    function createSpinner() {
      return h(IconLoadingOutline, {
        size: 14,
        className: "dwc-btn-spinner",
        style: { marginRight: 6, display: "inline-block", verticalAlign: "-2px", animation: "dwc-spin 0.8s linear infinite" },
      });
    }
    function Button({ variant, type, danger, loading, block, size, shape, className, children, href, target, rel, icon, ...props }) {
      let mappedVariant = variant ?? "outline";
      if (type === "primary") mappedVariant = "primary";
      else if (type === "text" || type === "link") mappedVariant = "ghost";

      const isPrimary = mappedVariant === "primary";
      const mappedSize = (size === "small" || size === "sm") ? "sm" : "md";

      const classes = [
        "dwc-btn",
        href ? "dwc-link-btn" : "",
        className,
        isPrimary ? "is-primary" : "",
        danger ? "is-danger dwc-btn-danger" : "",
        (danger && isPrimary) ? "dwc-btn-danger-primary" : "",
        block ? "is-block" : "",
        loading ? "is-loading" : "",
      ].filter(Boolean).join(" ");

      const iconElement = loading
        ? createSpinner()
        : (icon ? React.createElement("span", {
            key: "icon",
            className: "dwc-btn-icon",
            style: { display: "inline-flex", alignItems: "center" },
          }, icon) : null);
      const content = [iconElement, children];

      if (href) {
        return React.createElement("a", Object.assign({}, props, {
          href,
          target,
          rel: rel || (target === "_blank" ? "noreferrer" : undefined),
          className: classes || undefined,
          "aria-label": props["aria-label"],
          style: props.style,
        }), content);
      }

      if (isHostComponent(PrimitiveButton)) {
        return React.createElement(PrimitiveButton, Object.assign({}, props, {
          variant: mappedVariant,
          size: mappedSize,
          className: [className, danger ? "dwc-btn-danger" : ""].filter(Boolean).join(" ") || undefined,
          disabled: props.disabled || loading,
          icon: loading ? undefined : icon,
        }), loading ? createSpinner() : children);
      }

      return React.createElement("button", Object.assign({}, props, {
        type: "button",
        className: classes || undefined,
        disabled: props.disabled || loading,
      }), content);
    }

    const IconSettingsOutline16 = pickHostIcon("IconSettingsOutlineRegular", "IconSettingsOutline16");
    const CHANNEL_SETTINGS_EVENT = "dsh-weixin-channel:open-channel-settings";
    const CHANNEL_SETTINGS_STORAGE_KEY = "dsh-weixin-channel:pending-channel-settings";
    const SETTINGS_CODEX_TRIGGER_SELECTOR = "[data-dcu-settings-trigger]";
    const SETTINGS_CODEX_PAGE_SELECTOR = "[data-dcu-settings-page]";
    const SETTINGS_OPEN_SECTION_EVENT = "dcu-settings-open-section";
    function parseChannelSettingsRequest(value) {
      if (!value || typeof value !== "object") return undefined;
      const channelId = typeof value.channelId === "string" ? value.channelId.trim() : "";
      if (!channelId) return undefined;
      return { channelId, name: typeof value.name === "string" ? value.name : "" };
    }
    function writeChannelSettingsRequest(storage, request) {
      try { storage && storage.setItem(CHANNEL_SETTINGS_STORAGE_KEY, JSON.stringify(request)); } catch { /* ignore */ }
    }
    function requestChannelSettings(request) {
      if (typeof window === "undefined") return;
      writeChannelSettingsRequest(window.sessionStorage, request);
      window.dispatchEvent(new CustomEvent(CHANNEL_SETTINGS_EVENT, { detail: request }));
    }
    function readChannelSettingsRequest(storage) {
      if (!storage) return undefined;
      try {
        const raw = storage.getItem(CHANNEL_SETTINGS_STORAGE_KEY);
        return raw == null ? undefined : parseChannelSettingsRequest(JSON.parse(raw));
      } catch { return undefined; }
    }
    function clearChannelSettingsRequest(storage) {
      try { storage && storage.removeItem(CHANNEL_SETTINGS_STORAGE_KEY); } catch { /* ignore */ }
    }
    function resolveChannelSettingsTarget(request, channels) {
      const parsed = parseChannelSettingsRequest(request);
      if (!parsed || !Array.isArray(channels)) return undefined;
      const channel = channels.find((item) => item && item.id === parsed.channelId);
      if (!channel) return undefined;
      const accounts = channel.accounts || [];
      return { channelId: channel.id, accountId: accounts.length === 1 ? accounts[0].id : undefined };
    }
    function pickSettingsSectionButton(buttons, labels) {
      const normalize = (value) => String(value || "").replace(/\s+/g, "").trim().toLowerCase();
      const labelOf = (button) => normalize(button.textContent) || normalize(button.getAttribute && button.getAttribute("aria-label"));
      const targets = labels.map(normalize).filter(Boolean);
      for (const target of targets) {
        const match = buttons.find((button) => labelOf(button) === target);
        if (match) return match;
      }
      // 宿主可能在标签旁加计数或徽标；退一步做包含匹配。
      for (const target of targets) {
        const match = buttons.find((button) => {
          const text = labelOf(button);
          return text !== "" && (text.includes(target) || target.includes(text));
        });
        if (match) return match;
      }
      return undefined;
    }
    function pickSettingsLauncher(buttons) {
      const named = buttons.find((button) => {
        const label = `${button.textContent || ""} ${typeof button.getAttribute === "function" ? button.getAttribute("aria-label") || "" : ""}`.trim();
        return /(^|\s)(设置|settings)(\s|$)/i.test(label);
      });
      return named || (buttons.length === 1 ? buttons[0] : undefined);
    }
    function findAccountMenuTrigger() {
      const exact = [
        'button[aria-label="账号菜单"]',
        'button[aria-label="Account menu"]',
      ];
      for (const selector of exact) {
        const found = document.querySelector(selector);
        if (found) return found;
      }
      return [...document.querySelectorAll('button[aria-haspopup="menu"]')].find((button) => {
        const label = `${typeof button.getAttribute === "function" ? button.getAttribute("aria-label") || "" : ""} ${button.textContent || ""}`.trim();
        return /账号|account/i.test(label);
      });
    }
    function requestCodexSettingsSection(labels) {
      const trigger = typeof document !== "undefined" && document.querySelector(SETTINGS_CODEX_TRIGGER_SELECTOR);
      if (!trigger) return false;
      const request = new CustomEvent(SETTINGS_OPEN_SECTION_EVENT, { detail: { labels: [...labels] }, cancelable: true });
      return !trigger.dispatchEvent(request);
    }
    function openImSettingsPage(t) {
      openSettingsSection(
        [t("settings.label"), DWC_LOCALES.en["settings.label"], DWC_LOCALES.zh["settings.label"]],
        () => {},
        () => console.warn("[dsh-weixin-channel] 无法打开 IM 助理设置页"),
      );
    }
    function openSettingsSection(labels, onSelected, onMissing) {
      if (typeof document === "undefined" || typeof window === "undefined") {
        if (onMissing) onMissing();
        return;
      }
      if (requestCodexSettingsSection(labels)) {
        if (onSelected) onSelected();
        return;
      }
      const launchers = [...document.querySelectorAll('button[aria-haspopup="dialog"], button[aria-label*="设置"], button[aria-label*="Settings"], [data-dcu-settings-trigger]')];
      const namedSettingsButton = [...document.querySelectorAll("button")].find((button) => /^(设置|settings)$/i.test((button.getAttribute("aria-label") || "").trim()));
      const launcher = namedSettingsButton || pickSettingsLauncher(launchers);
      const pageTrigger = document.querySelector(SETTINGS_CODEX_TRIGGER_SELECTOR);
      const dialogOpen = document.querySelector('[role="dialog"]') !== null;
      const pageOpen = document.querySelector(SETTINGS_CODEX_PAGE_SELECTOR) !== null;
      let menuTrigger;
      if (!dialogOpen && !pageOpen && !launcher && !pageTrigger) {
        menuTrigger = findAccountMenuTrigger();
        if (!menuTrigger) {
          if (onMissing) onMissing();
          return;
        }
        menuTrigger.click();
      } else if (!dialogOpen && !pageOpen) {
        (pageTrigger || launcher).click();
      }
      let frame;
      let finished = false;
      let menuActivated = false;
      let timeout;
      const observer = new MutationObserver(() => { schedule(); });
      const cleanup = () => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        window.clearTimeout(timeout);
        if (frame !== undefined) window.cancelAnimationFrame(frame);
      };
      const wait = () => {
        timeout = window.setTimeout(() => {
          if (select()) return;
          cleanup();
          if (onMissing) onMissing();
        }, 5000);
      };
      const select = () => {
        if (menuTrigger !== undefined && !menuActivated) {
          const items = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button')];
          const entry = pickSettingsSectionButton(items, ["设置", "Settings"]);
          if (!entry) return false;
          menuActivated = true;
          window.clearTimeout(timeout);
          wait();
          entry.click();
          schedule();
          return true;
        }
        const buttons = [
          ...document.querySelectorAll('[role="dialog"] nav button, [role="dialog"] button'),
          ...document.querySelectorAll(SETTINGS_CODEX_PAGE_SELECTOR + " nav button"),
          ...document.querySelectorAll("nav button, button"),
        ];
        const target = pickSettingsSectionButton(buttons, labels);
        if (!target) return false;
        cleanup();
        target.click();
        if (onSelected) onSelected();
        return true;
      };
      const schedule = () => {
        if (finished || frame !== undefined) return;
        frame = window.requestAnimationFrame(() => { frame = undefined; select(); });
      };
      wait();
      observer.observe(document.body, { childList: true, subtree: true });
      schedule();
    }
    const EMPTY_EXTRA_TABS = [];
    const inject = ["slots", "sessions", "workspaces", "locale", "uiWorkspace", "layout"];
    const API_BASE = "/api/dsh-weixin-channel";
    const TAB_KEY = "dsh-weixin-channel.sidebar-tab";
    const ACCOUNT_SELECTION_KEY = "dsh-weixin-channel.settings.selected-account";
    const DWC_LOCALE_NS = "weixin-channel";
    const DWC_LOCALES = {
      zh: {
        "account.autoNameNote": "该名称仅用于本机显示。",
        "account.channelName": "频道名称",
        "account.currentWorkspace": "当前工作区",
        "account.defaultName": "{channel}频道 {count}",
        "account.noSessions": "还没有会话。用微信给机器人发一条消息后，会话会出现在这里。",
        "account.presetNote": "更改后使用新会话，旧会话保留。",
        "account.presetUnavailable": "预设不可用",
        "account.privateAccess": "私聊准入",
        "account.privateAll": "允许所有私聊用户",
        "account.privateApproved": "仅已批准用户",
        "account.remark": "频道名称",
        "account.removeConfirm": "确定删除这个微信频道？本机保存的配置、登录凭据和会话映射将一并删除，删除后可以重新添加频道。",
        "account.rename": "修改频道名称",
        "account.selectModel": "请选择模型",
        "account.selectPermission": "请选择权限",
        "account.selectWorkspace": "请选择工作区",
        "account.sendMode": "发送方式",
        "account.sendQueue": "排队发送",
        "account.sendSteer": "插话发送",
        "account.sendSteerNote": "插话发送会把消息作为补充指令立即交给运行中的任务；任务空闲时与排队发送相同。",
        "account.statusNotConnected": "未连接",
        "account.workspace": "工作区",
        "action.addAccount": "添加微信频道",
        "action.approve": "批准",
        "action.cancel": "取消",
        "action.checkConnection": "诊断连接",
        "action.collapse": "收起",
        "action.confirm": "确认",
        "action.deny": "拒绝",
        "action.expand": "展开",
        "action.generateQr": "生成二维码",
        "action.reconnectAccount": "重新连接",
        "action.removeAccount": "删除频道",
        "action.saving": "保存中…",
        "action.settings": "设置",
        "app.copied": "已复制",
        "app.copy": "复制",
        "app.info": "微信绑定信息",
        "app.loggedIn": "已登录",
        "app.login": "登录状态",
        "app.notLoggedIn": "未登录",
        "app.notSaved": "未保存",
        "app.wechatId": "微信用户 ID",
        "bind.expire": "二维码 {time} 后过期",
        "bind.generating": "正在生成…",
        "bind.manual": "手动配置",
        "bind.newIdentity": "检测到新的微信身份",
        "bind.qrAlt": "{channel} 登录二维码",
        "bind.quick": "快捷绑定（推荐）",
        "bind.refresh": "重新生成二维码",
        "bind.retry": "请重新生成二维码",
        "bind.saving": "正在保存频道…",
        "bind.scanned": "已扫码，请在手机上确认",
        "bind.success": "登录成功，微信频道已连接",
        "bind.tabsAria": "绑定方式",
        "bind.title": "添加微信频道",
        "channel.empty": "添加微信频道后，就可以在微信里直接驱动本机智能体。个人微信一个用户只能创建一个机器人，删除现有频道后才能重新添加。",
        "channel.emptyTitle": "还没有微信频道",
        "channel.sessions": "微信会话",
        "channel.status": "连接状态",
        "channel.wechatId": "微信用户",
        "channel.weixin": "微信",
        "command.disabled": "仅正常对话",
        "command.dm": "私聊命令",
        "command.enabled": "可以执行命令",
        "command.group": "群聊命令",
        "composer.addWorkspace": "添加工作区…",
        "composer.model": "模型",
        "composer.modelLoading": "模型加载中",
        "composer.modelReadOnly": "在频道设置中切换模型",
        "composer.modelUnavailable": "模型不可用",
        "composer.noWorkspaces": "暂无工作区",
        "composer.permission": "权限",
        "composer.remoteHint": "该会话只能在微信客户端继续；本地输入已禁用。",
        "composer.remoteTitle": "微信频道会话",
        "composer.stopConfirm": "停止生成",
        "composer.stopDescription": "将中断当前会话正在运行的大模型推理；已排队的消息会保留。",
        "composer.stopTitle": "停止生成？",
        "composer.workspaceRequired": "请先添加工作区，否则无法保存",
        "connection.checkFailed": "状态检查未完成，请重试；仍失败时查看本机日志。",
        "connection.checkedAt": "检查时间",
        "connection.checking": "检查中…",
        "connection.connected": "已连接",
        "connection.connecting": "连接中",
        "connection.diagnostics": "连接诊断",
        "connection.disconnected": "未连接",
        "connection.error": "连接异常",
        "connection.paused": "接收已暂停",
        "connection.receiveOff": "接收开关已关闭；请在频道设置中开启后再发送消息。",
        "connection.receiveOn": "接收开关已开启",
        "connection.receiveUnknown": "无法读取接收开关，请重启 DSH 并刷新页面。",
        "connection.reconnecting": "重连中",
        "connection.restartRequired": "前后端版本不一致。请完整重启 DSH 并刷新页面后重新诊断。",
        "connection.stopped": "已停止",
        "connection.unknown": "状态未知",
        "diagnostic.auth": "微信登录已失效，请重新扫码登录或删除频道后重新添加。",
        "diagnostic.cancelled": "诊断已取消，未确认连接状态。",
        "diagnostic.changed": "频道状态已变化，请重新诊断。",
        "diagnostic.config": "微信登录与接口检查",
        "diagnostic.failed": "失败",
        "diagnostic.invalid-response": "平台响应不完整或格式不符，无法确认可用。",
        "diagnostic.local-state": "无法读取凭据或初始化本地频道状态，请检查本机配置及文件访问权限。",
        "diagnostic.missing-context": "缺少原聊天上下文，请让微信账号先发送一条消息后重试。",
        "diagnostic.network": "网络请求失败，请检查网络或代理。",
        "diagnostic.not-connected": "当前没有可验证的连接，请先重新连接。",
        "diagnostic.ok": "平台已返回有效响应",
        "diagnostic.passed": "通过",
        "diagnostic.permission": "平台拒绝访问，请检查微信登录状态。",
        "diagnostic.rate-limit": "平台限流，请稍后再试。",
        "diagnostic.rejected": "平台拒绝请求，请稍后再试。",
        "diagnostic.scope": "以下为本次平台接口或心跳检查结果。未发送测试消息，消息投递权限仍未验证。",
        "diagnostic.server": "平台服务异常，请稍后再试。",
        "diagnostic.timeout": "诊断超时，请检查网络后重试。",
        "diagnostic.title": "连接诊断",
        "diagnostic.unsupported": "当前配置不支持此诊断，未判定为通过。",
        "diagnostic.unverified": "未验证",
        "error.action": "操作失败",
        "error.addWorkspace": "新增工作区失败",
        "error.chooseWorkspace": "请选择工作区目录",
        "error.connection": "无法连接本机微信频道接口",
        "error.detailsInLog": "操作失败，请查看服务器日志。",
        "error.load": "加载失败",
        "error.qr": "无法生成二维码",
        "error.request": "请求失败",
        "error.save": "保存失败",
        "error.workspaceUnavailable": "当前 Host 无法新增工作区",
        "loading": "加载中…",
        "pending.notice": "有访问请求。批准后该用户才能驱动本机助手。",
        "permission.fullAccess": "完全访问",
        "permission.readOnly": "只读",
        "permission.workspaceWrite": "工作区写入",
        "qr.default": "请使用手机微信扫描二维码",
        "qr.weixin": "请使用手机微信扫描二维码并确认登录",
        "rail.weixin": "微信频道",
        "server.accessDenied": "未授权：请管理员在设置 → DSH微信频道 中批准你的访问。",
        "server.accountConnectFailed": "频道连接失败，请查看本机日志",
        "server.accountMissing": "频道不存在",
        "server.accountReconnectFailed": "重新连接频道失败，请查看本机日志",
        "server.channelExists": "已有微信频道，请先删除现有频道后再添加",
        "server.channelUnconfigured": "渠道未配置",
        "server.createWorkspace": "请先添加工作区",
        "server.missingCredentials": "凭据不足，无法启动渠道",
        "server.qrExpired": "二维码已过期",
        "server.qrIncomplete": "扫码未完成",
        "server.qrUnsupported": "该渠道不支持扫码绑定",
        "server.remarkControl": "频道名称不能包含换行或控制字符",
        "server.remarkTooLong": "频道名称不能超过 40 个字符",
        "server.selectAccountSettings": "请选择提供商、模型、工作区或权限",
        "server.selectModel": "请选择提供商和模型",
        "server.selectPermission": "请选择权限",
        "server.selectWorkspace": "请选择工作区",
        "server.sessionMissing": "会话不存在",
        "server.unknownChannel": "未知渠道",
        "session.untitled": "未命名会话",
        "settings.aria": "DSH微信频道",
        "settings.description": "把个人微信机器人接入本机 DeepSeek Harness；一个插件只承载一个微信频道，配置仅保存在本机。",
        "settings.label": "DSH微信频道",
        "settings.publicChatNotice": "未批准用户可以发起聊天，但不能批准工具调用。",
        "settings.title": "DSH微信频道",
        "status.longConnection": "已登录",
        "status.saved": "已保存",
        "status.saving": "保存中…",
        "status.stopped": "已停止",
        "time.ago": "{t}前",
        "time.days": "{n}天",
        "time.hours": "{n}小时",
        "time.minutes": "{n}分钟",
        "time.months": "{n}个月",
        "time.now": "刚刚",
        "time.years": "{n}年",
      },
      en: {
        "account.autoNameNote": "This name is only used locally.",
        "account.channelName": "Channel name",
        "account.currentWorkspace": "Current workspace",
        "account.defaultName": "{channel} channel {count}",
        "account.noSessions": "No sessions yet. Send the bot a message from WeChat and the session will appear here.",
        "account.presetNote": "Changes start a new session; previous sessions are kept.",
        "account.presetUnavailable": "Preset unavailable",
        "account.privateAccess": "Direct chat access",
        "account.privateAll": "Allow all DM users",
        "account.privateApproved": "Approved users only",
        "account.remark": "Channel name",
        "account.removeConfirm": "Remove this WeChat channel? Its saved settings, login credential, and session mappings will be deleted. You can add a channel again afterwards.",
        "account.rename": "Edit channel name",
        "account.selectModel": "Select a model",
        "account.selectPermission": "Select a permission",
        "account.selectWorkspace": "Select a workspace",
        "account.sendMode": "Send mode",
        "account.sendQueue": "Queue",
        "account.sendSteer": "Steer",
        "account.sendSteerNote": "Steer hands the message to the running task as additional instructions at its next step; when the task is idle it behaves like Queue.",
        "account.statusNotConnected": "Not connected",
        "account.workspace": "Workspace",
        "action.addAccount": "Add Weixin channel",
        "action.approve": "Approve",
        "action.cancel": "Cancel",
        "action.checkConnection": "Diagnose connection",
        "action.collapse": "Collapse",
        "action.confirm": "Confirm",
        "action.deny": "Deny",
        "action.expand": "Expand",
        "action.generateQr": "Generate QR code",
        "action.reconnectAccount": "Reconnect",
        "action.removeAccount": "Remove",
        "action.saving": "Saving…",
        "action.settings": "Settings",
        "app.copied": "Copied",
        "app.copy": "Copy",
        "app.info": "WeChat binding",
        "app.loggedIn": "Signed in",
        "app.login": "Login",
        "app.notLoggedIn": "Not signed in",
        "app.notSaved": "Not saved",
        "app.wechatId": "WeChat user ID",
        "bind.expire": "QR code expires in {time}",
        "bind.generating": "Generating…",
        "bind.manual": "Manual setup",
        "bind.newIdentity": "A new WeChat identity was detected",
        "bind.qrAlt": "{channel} login QR code",
        "bind.quick": "Quick setup (recommended)",
        "bind.refresh": "Generate a new QR code",
        "bind.retry": "Generate a new QR code",
        "bind.saving": "Saving channel…",
        "bind.scanned": "Scanned. Confirm on your phone.",
        "bind.success": "Signed in and the WeChat channel is connected",
        "bind.tabsAria": "Sign-in method",
        "bind.title": "Add WeChat channel",
        "channel.empty": "Add a WeChat channel to drive local agents from WeChat. A personal WeChat user can create only one bot, so you must remove the current channel before adding another.",
        "channel.emptyTitle": "No WeChat channel yet",
        "channel.sessions": "WeChat sessions",
        "channel.status": "Connection",
        "channel.wechatId": "WeChat user",
        "channel.weixin": "WeChat",
        "command.disabled": "Conversation only",
        "command.dm": "Direct chat commands",
        "command.enabled": "Commands enabled",
        "command.group": "Group commands",
        "composer.addWorkspace": "Add workspace…",
        "composer.model": "Model",
        "composer.modelLoading": "Loading models",
        "composer.modelReadOnly": "Change the model in channel settings",
        "composer.modelUnavailable": "Model unavailable",
        "composer.noWorkspaces": "No workspaces",
        "composer.permission": "Permission",
        "composer.remoteHint": "This session can only continue in WeChat; local input is disabled.",
        "composer.remoteTitle": "WeChat channel session",
        "composer.stopConfirm": "Stop generating",
        "composer.stopDescription": "This interrupts the running model turn in this session; queued messages are preserved.",
        "composer.stopTitle": "Stop generating?",
        "composer.workspaceRequired": "Add a workspace before saving.",
        "connection.checkFailed": "The status check did not finish. Retry, or check the local logs if it keeps failing.",
        "connection.checkedAt": "Checked at",
        "connection.checking": "Checking…",
        "connection.connected": "Connected",
        "connection.connecting": "Connecting",
        "connection.diagnostics": "Connection diagnostics",
        "connection.disconnected": "Disconnected",
        "connection.error": "Connection error",
        "connection.paused": "Receiving paused",
        "connection.receiveOff": "Receiving is disabled. Enable it in channel settings before sending messages.",
        "connection.receiveOn": "Receiving is enabled",
        "connection.receiveUnknown": "The receiving switch is unavailable. Restart DSH and refresh the page.",
        "connection.reconnecting": "Reconnecting",
        "connection.restartRequired": "Frontend and backend versions differ. Restart DSH, refresh the page, and run the check again.",
        "connection.stopped": "Stopped",
        "connection.unknown": "Status unknown",
        "diagnostic.auth": "The WeChat login expired. Sign in again by QR code, or remove the channel and add it again.",
        "diagnostic.cancelled": "The check was cancelled. Connection status was not verified.",
        "diagnostic.changed": "The channel state changed. Run diagnostics again.",
        "diagnostic.config": "WeChat login and API check",
        "diagnostic.failed": "Failed",
        "diagnostic.invalid-response": "The platform response was incomplete or invalid. Availability could not be confirmed.",
        "diagnostic.local-state": "Could not read credentials or initialize local channel state. Check local configuration and file permissions.",
        "diagnostic.missing-context": "The original chat context is missing. Send a message from the WeChat account first, then retry.",
        "diagnostic.network": "The request failed. Check your network or proxy.",
        "diagnostic.not-connected": "No active connection is available to verify. Reconnect first.",
        "diagnostic.ok": "The platform returned a valid response",
        "diagnostic.passed": "Passed",
        "diagnostic.permission": "Access was denied. Check the WeChat login state.",
        "diagnostic.rate-limit": "The platform rate limit was reached. Retry later.",
        "diagnostic.rejected": "The platform rejected the request. Retry later.",
        "diagnostic.scope": "Results from platform queries or a connection heartbeat in this check. No test messages were sent; message delivery permissions remain unverified.",
        "diagnostic.server": "The platform service failed. Retry later.",
        "diagnostic.timeout": "The check timed out. Check your network and retry.",
        "diagnostic.title": "Connection diagnostics",
        "diagnostic.unsupported": "The current configuration does not support this check. It has not passed.",
        "diagnostic.unverified": "Unverified",
        "error.action": "Action failed",
        "error.addWorkspace": "Could not add workspace",
        "error.chooseWorkspace": "Choose a workspace directory",
        "error.connection": "Could not connect to the local WeChat channel API",
        "error.detailsInLog": "The operation failed. Check the server logs for details.",
        "error.load": "Could not load",
        "error.qr": "Could not generate a QR code",
        "error.request": "Request failed",
        "error.save": "Could not save",
        "error.workspaceUnavailable": "This Host cannot create workspaces",
        "loading": "Loading…",
        "pending.notice": "There are access requests. Approve a user before they can control the local assistant.",
        "permission.fullAccess": "Full access",
        "permission.readOnly": "Read Only",
        "permission.workspaceWrite": "Workspace Write",
        "qr.default": "Scan the QR code with WeChat on your phone",
        "qr.weixin": "Scan the QR code with WeChat on your phone and confirm the login",
        "rail.weixin": "Weixin",
        "server.accessDenied": "Access denied: ask an administrator to approve you in Settings → DSH WeChat Channel.",
        "server.accountConnectFailed": "Could not connect the channel. Check the local logs.",
        "server.accountMissing": "Channel does not exist",
        "server.accountReconnectFailed": "Could not reconnect the channel. Check the local logs.",
        "server.channelExists": "A WeChat channel already exists. Remove it before adding another.",
        "server.channelUnconfigured": "Channel is not configured",
        "server.createWorkspace": "Add a workspace first.",
        "server.missingCredentials": "The channel cannot start because credentials are missing",
        "server.qrExpired": "QR code has expired",
        "server.qrIncomplete": "QR setup was not completed",
        "server.qrUnsupported": "This channel does not support QR setup",
        "server.remarkControl": "Channel name cannot contain line breaks or control characters",
        "server.remarkTooLong": "Channel name cannot exceed 40 characters",
        "server.selectAccountSettings": "Select a provider, model, workspace, or permission setting",
        "server.selectModel": "Select a provider and model",
        "server.selectPermission": "Select a permission",
        "server.selectWorkspace": "Select a workspace",
        "server.sessionMissing": "Session does not exist",
        "server.unknownChannel": "Unknown channel",
        "session.untitled": "Untitled session",
        "settings.aria": "DSH WeChat Channel",
        "settings.description": "Connect a personal WeChat bot to the local DeepSeek Harness. One plugin hosts exactly one WeChat channel; settings stay on this machine.",
        "settings.label": "DSH WeChat Channel",
        "settings.publicChatNotice": "Unapproved users can start chats, but they cannot approve tool calls.",
        "settings.title": "DSH WeChat Channel",
        "status.longConnection": "Signed in",
        "status.saved": "Saved",
        "status.saving": "Saving…",
        "status.stopped": "Stopped",
        "time.ago": "{t} ago",
        "time.days": "{n}d",
        "time.hours": "{n}h",
        "time.minutes": "{n}min",
        "time.months": "{n}mo",
        "time.now": "now",
        "time.years": "{n}y",
      },
    };
    const fallbackT = (key) => key;
    const h = React.createElement;
    function HostThemeProvider({ children }) {
      return children;
    }

    const CSS = `
.dwc-page,.dwc-account-modal,.dwc-bind-modal,.dwc-inspector{--dwc-text:var(--dsw-alias-label-primary,var(--dsh-text,#e6edf3));--dwc-muted:var(--dsw-alias-label-tertiary,var(--dsh-text-muted,#8b949e));--dwc-line:var(--dsw-alias-border-l2,var(--dsh-border,rgba(255,255,255,.1)));--dwc-card:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));--dwc-card-hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));--dwc-ok:var(--dsw-alias-state-success-primary,#3fb950);--dwc-warning:var(--dsw-alias-state-warning-primary,#d29922);--dwc-danger:var(--dsw-alias-state-error-primary,#f85149);--dwc-accent:var(--dsw-alias-brand-primary,#4b7cff)}
.dwc-page{box-sizing:border-box;max-width:none;width:100%;margin:0;padding:0 0 32px;color:var(--dwc-text)}
.dwc-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:12px}
.dwc-heading h2,.dwc-title{margin:0;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.4px;white-space:nowrap;text-align:left}
.dwc-title-row{display:flex;align-items:center;gap:8px 12px;min-width:0;flex-wrap:wrap}
.dwc-title-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dwc-title-links>span[data-mpi-check]{display:inline-flex;align-items:center}
[data-dwc-nav-icon="assistant"]>svg{display:none!important}
.dwc-nav-icon-assistant{display:inline-block;flex:none;width:16px;height:16px;background:currentColor;-webkit-mask:var(--dwc-nav-icon-mask) center/contain no-repeat;mask:var(--dwc-nav-icon-mask) center/contain no-repeat}
.dwc-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:32px;padding:0 12px;border:0.5px solid var(--dsw-alias-border-l3,#555);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:13px;line-height:20px;cursor:pointer;user-select:none;box-sizing:border-box;text-decoration:none;transition:border-color 120ms ease,color 120ms ease,background 120ms ease}
.dwc-btn:not(.is-primary):not(.dwc-btn-danger){color:var(--dsw-alias-label-primary,#eee)!important}
.dwc-btn:hover:not(:disabled):not(.dwc-btn-danger){border-color:var(--dsw-alias-border-l3,#666)!important;color:var(--dsw-alias-label-primary,#fff)!important;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))!important}
.dwc-btn:focus-visible{outline:var(--dsw-focus-ring-width,1px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4b7cff))!important;outline-offset:0!important}
.dwc-btn:disabled,.dwc-btn.is-disabled{opacity:.4!important;cursor:not-allowed!important;pointer-events:none!important}
.dwc-btn.is-primary,.dwc-bind-ready .dwc-btn.is-primary{background:var(--dsw-alias-button-primary-fill,#f9fafb)!important;border-color:transparent!important;color:var(--dsw-alias-label-primary-foreground,#0f1115)!important}
.dwc-btn.is-primary *,.dwc-bind-ready .dwc-btn.is-primary *{color:inherit!important;fill:currentColor!important}
.dwc-btn.is-primary:hover:not(:disabled),.dwc-bind-ready .dwc-btn.is-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#ebeef2)!important;color:var(--dsw-alias-label-primary-foreground,#0f1115)!important}
.dwc-btn.is-primary:disabled,.dwc-bind-ready .dwc-btn.is-primary:disabled{opacity:.4!important;cursor:not-allowed!important}
.dwc-btn.is-block{width:100%!important}
.dwc-link-btn{height:28px!important;padding:0 10px!important;font-size:12px!important}
.dwc-sub{margin:12px 0 0;max-width:none;color:var(--dwc-muted);font-size:14px;line-height:22px;text-align:left}
.dwc-error{color:var(--dwc-danger);font-size:12px;margin:0 0 12px}
.dwc-pending,.dwc-page>.dwc-feedback,.dwc-inspector .dwc-feedback{margin:0 0 12px}
.dwc-feedback{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:var(--dsw-radius-sm,8px);font-size:13px;line-height:20px;border:0.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.08));color:var(--dsw-alias-label-primary,#eee)}
.dwc-feedback-error{background:color-mix(in srgb, var(--dsw-alias-state-error-primary,#f85149) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary,#f85149) 30%, transparent);color:var(--dsw-alias-label-primary,#eee)}
.dwc-feedback-error .dwc-feedback-icon{color:var(--dsw-alias-state-error-primary,#f85149)}
.dwc-feedback-warning{background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#d29922) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#d29922) 30%, transparent);color:var(--dsw-alias-label-primary,#eee)}
.dwc-feedback-warning .dwc-feedback-icon{color:var(--dsw-alias-state-warning-primary,#d29922)}
.dwc-feedback-success{background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb950) 12%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb950) 30%, transparent);color:var(--dsw-alias-label-primary,#eee)}
.dwc-feedback-success .dwc-feedback-icon{color:var(--dsw-alias-state-success-primary,#3fb950)}
.dwc-feedback-info{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.08));color:var(--dsw-alias-label-primary,#eee)}
.dwc-feedback-icon{display:inline-flex;align-items:center;flex:none;margin-top:3px}
.dwc-feedback-body{flex:1;min-width:0;word-break:break-word}
.dwc-pending{display:flex;flex-direction:column;gap:8px}
.dwc-feedback-head{display:flex;align-items:center;gap:8px}
.dwc-feedback-title{font-weight:550;line-height:20px}
.dwc-pending-list{display:flex;flex-direction:column;gap:6px;width:100%}
.dwc-pending-row{display:flex;gap:8px;align-items:center;padding:4px 0}
.dwc-wrap{display:flex;flex-direction:column;min-height:0;flex:1;height:100%;overflow:hidden}.dwc-official-tree{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dwc-tabs-wrap{display:flex;margin:2px var(--dsh-sidebar-inline-padding,12px) 8px 0;padding:0;width:auto}
.dwc-tabs-wrap .dwc-segmented-tabs{display:grid!important;width:100%!important;box-sizing:border-box!important;height:32px!important;min-height:32px!important;max-height:32px!important;padding:2px!important;border:0!important;border-radius:var(--dsw-radius-sm,8px)!important;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,rgba(255,255,255,.08))!important;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.02))!important}
.dwc-tabs-wrap .dwc-segmented-tabs>span{inset:2px auto 2px 2px!important;width:calc((100% - 4px)/var(--dwc-tab-count,2))!important;border-radius:6px!important;border:0.5px solid var(--dsw-alias-border-l3,rgba(255,255,255,.12))!important;background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.08))!important;box-shadow:none!important}
.dwc-tabs-wrap .dwc-segmented-tabs [role=tab]{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;height:28px!important;padding:0 clamp(6px,calc(100% - 60px),12px)!important;font-size:13px!important;line-height:20px!important;border-radius:6px!important;color:var(--dsw-alias-label-secondary,#8b8f98)!important;text-align:center!important;white-space:nowrap!important;box-sizing:border-box!important;transition:color 150ms ease!important}
.dwc-tabs-wrap .dwc-segmented-tabs [role=tab]>*{display:inline-flex!important;align-items:center!important;justify-content:center!important}
.dwc-tabs-wrap .dwc-segmented-tabs [role=tab]:hover{color:var(--dsw-alias-label-primary,inherit)!important}
.dwc-tabs-wrap .dwc-segmented-tabs [role=tab][aria-selected=true]{color:var(--dsw-alias-label-primary,inherit)!important;font-weight:600!important}
.dwc-bind-tabs-wrap{width:100%;margin:0 0 16px}
.dwc-bind-tabs-wrap.is-disabled{opacity:.6;pointer-events:none}
.dwc-bind-panel[hidden]{display:none!important}
.dwc-bind-tabs-wrap .dwc-bind-tabs{width:100%;height:32px;box-sizing:border-box;border-bottom:0;background:color-mix(in srgb,var(--dsw-alias-label-primary,currentColor) 3%,transparent)!important;border-radius:var(--dsw-radius-sm,8px)!important;border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.05))!important;padding:2px!important}
.dwc-bind-tabs-wrap .dwc-bind-tabs>span{inset:2px auto 2px 2px!important;width:calc((100% - 4px)/2)!important;border-radius:calc(var(--dsw-radius-sm,8px) - 2px)!important;border:0.5px solid color-mix(in srgb,var(--dsw-alias-label-primary,currentColor) 12%,transparent)!important;background:color-mix(in srgb,var(--dsw-alias-label-primary,currentColor) 8%,transparent)!important;box-shadow:none!important}
.dwc-bind-tabs-wrap .dwc-bind-tabs [role=tab]{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;width:100%!important;height:26px!important;padding:0 10px!important;font-size:13px!important;line-height:18px!important;border-radius:calc(var(--dsw-radius-sm,8px) - 2px)!important;color:var(--dsw-alias-label-secondary,#8b8f98);text-align:center!important}
.dwc-bind-tabs-wrap .dwc-bind-tabs [role=tab]>*{display:inline-flex!important;align-items:center!important;justify-content:center!important}
.dwc-bind-tabs-wrap .dwc-bind-tabs [role=tab]:hover{color:var(--dsw-alias-label-primary,inherit)}
.dwc-bind-tabs-wrap .dwc-bind-tabs [role=tab][aria-selected=true]{color:var(--dsw-alias-label-primary,inherit)!important;font-weight:600}
.dwc-tabs{display:flex;gap:18px;padding:4px 12px 0;border-bottom:1px solid var(--dwc-line)}
.dwc-tab{appearance:none;border:0;background:transparent;color:var(--dwc-muted);padding:8px 0;font-size:13px;cursor:pointer}
.dwc-tab.on{color:var(--dwc-text);box-shadow:inset 0 -2px 0 currentColor}
.dwc-tabs{flex:none}
.dwc-empty{color:var(--dwc-muted);font-size:12px;padding:12px 8px}
.dwc-channel-official{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0;overflow:hidden}
.dwc-channel-official>div{flex:1;min-width:0;min-height:0}
.dwc-channel-official>.dwc-channel-error{flex:none}
.dwc-channel-official>.dwc-channel-unavailable{flex:1}
.dwc-channel-error{padding:8px 12px;color:var(--dsw-alias-state-error-primary,#f85149);font-size:12px;line-height:18px}
.dwc-channel-unavailable{padding:16px 12px;color:var(--dsw-alias-label-tertiary,#8b8f98);font-size:13px;line-height:20px}
.dwc-session-channel-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex:none}
/* 频道页签复用官方工作区浏览器：分组头操作按模式裁剪。 */
.dwc-channel-official[data-mode="channel"] [data-row-key^="workspace:dsh-im-channel:"]>span:last-child>:last-child{display:none!important}
.dwc-channel-official[data-mode="workspace"] [data-row-key^="workspace:"]>span:last-child,
.dwc-channel-official[data-mode="workspace-tree"] [data-row-key^="workspace:"]>span:last-child{display:none!important}
.dwc-logo{width:28px;height:28px;flex:none;display:block;line-height:0;background:transparent}
.dwc-logo svg{width:28px;height:28px;display:block}
.dwc-logo.sm{width:16px;height:16px;overflow:hidden;display:grid;place-items:center}
.dwc-logo.sm svg{width:16px;height:16px;transform:none}
.dwc-qrbox{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0 4px}
.dwc-qrbox img{width:200px;height:200px;background:#fff;border:1px solid var(--dwc-line);border-radius:12px;object-fit:contain}
.dwc-bind-ready{display:flex;flex-direction:column;align-items:center;gap:14px;padding:12px 0 4px}.dwc-bind-ready .dwc-btn{min-width:136px}.dwc-bind-status{min-height:40px;display:grid;place-items:center;color:var(--dwc-muted);font-size:13px;text-align:center}
.dwc-hint{margin:0;color:var(--dwc-muted);font-size:13px;text-align:center;line-height:1.6}
.dwc-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:13px}
.dwc-field .dwc-input,.dwc-field input{width:100%}
.dwc-input,.dwc-account-remark-input,.dwc-field input{box-sizing:border-box!important;height:36px!important;padding:0 12px!important;border:0.5px solid var(--dsw-alias-border-l2,#494949)!important;border-radius:var(--dsw-radius-sm,8px)!important;background:var(--dsw-alias-bg-layer-1,transparent)!important;color:var(--dsw-alias-label-primary,#eee)!important;font:inherit!important;font-size:13px!important;line-height:20px!important;transition:border-color 120ms ease,background 120ms ease!important}
.dwc-textarea{height:auto!important;min-height:80px;padding:8px 12px!important;resize:vertical}
.dwc-input:hover:not(:disabled),.dwc-account-remark-input:hover:not(:disabled),.dwc-field input:hover:not(:disabled){border-color:var(--dsw-alias-border-l3,#666)!important}
.dwc-input:focus,.dwc-account-remark-input:focus,.dwc-field input:focus{border-color:var(--dsw-alias-brand-primary,#4b7cff)!important;outline:var(--dsw-focus-ring-width,1px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4b7cff))!important;outline-offset:0!important}
.dwc-input::placeholder,.dwc-account-remark-input::placeholder,.dwc-field input::placeholder{color:var(--dsw-alias-label-tertiary,#888)!important}
.dwc-input:disabled,.dwc-account-remark-input:disabled{opacity:.5!important;cursor:not-allowed!important}
.dwc-checkbox-label{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-primary,#eee);cursor:pointer;user-select:none}
.dwc-checkbox-label.is-disabled{opacity:.5;cursor:not-allowed}
.dwc-checkbox{width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary,#4176e6);cursor:inherit}
.dwc-tag{display:inline-flex!important;align-items:center!important;gap:4px!important;height:22px!important;padding:0 8px!important;font-size:12px!important;line-height:20px!important;border-radius:var(--dsw-radius-sm,6px)!important;font-weight:500!important;box-sizing:border-box!important;vertical-align:middle!important;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));color:var(--dsw-alias-label-secondary,#b9b9b9);border:none}
.dwc-tag .dwc-btn-spinner{width:11px!important;height:11px!important;margin-right:2px!important;vertical-align:0!important}
.dwc-tag-info,.dwc-tag-processing,.dwc-tag.is-busy{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 14%,transparent)!important;color:var(--dsw-alias-state-business-primary,#4176e6)!important}
.dwc-tag-success{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#3fb950) 14%,transparent)!important;color:var(--dsw-alias-state-success-primary,#3fb950)!important}
.dwc-tag-warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d29922) 14%,transparent)!important;color:var(--dsw-alias-state-warn-primary,#d29922)!important}
.dwc-tag-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#f85149) 14%,transparent)!important;color:var(--dsw-alias-state-error-primary,#f85149)!important}
.dwc-modal-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1100}
.dwc-modal-mask{position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.dwc-modal-wrap{position:relative;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);overflow:auto;display:flex}
.dwc-modal-panel{position:relative;isolation:isolate;box-sizing:border-box;padding:24px 28px 28px;border-radius:var(--dsw-radius-panel,28px);background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(20px));-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,blur(20px));border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));box-shadow:var(--dsw-elevation-panel,0 20px 48px -12px rgba(0,0,0,.35));color:var(--dsw-alias-label-primary,#eee);display:flex;flex-direction:column;gap:16px}
.dwc-modal-header{display:flex;align-items:center;justify-content:space-between;min-height:24px}
.dwc-modal-title{font-size:17px;font-weight:600;line-height:24px;color:var(--dsw-alias-label-primary,#eee)}
.dwc-modal-close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;transition:all 120ms ease}
.dwc-modal-close:hover{color:var(--dsw-alias-label-primary,#fff);background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.dwc-modal-body{min-height:0;overflow:visible;display:flex;flex-direction:column;gap:12px}
.dwc-modal-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}
.dwc-modal-footer-wrap{display:flex;justify-content:flex-end;margin-top:12px;padding-top:16px}
.dwc-inspector-actions>button{flex:none;white-space:nowrap}
.dwc-confirm-content{margin:8px 0 0;font-size:13px;line-height:22px;color:var(--dsw-alias-label-secondary,#b9b9b9)}
.dwc-page.dwc-account-page{container-type:inline-size;min-width:0;width:100%;padding:0 0 32px}
.dwc-account-shell,.dwc-account-shell *{box-sizing:border-box}
.dwc-account-shell{display:block;min-height:0;border:0;border-radius:0;overflow:visible;background:transparent}
.dwc-platforms{display:flex;flex-direction:column;gap:12px;padding:0;border:0;background:transparent;min-width:0}
.dwc-platform{border:1px solid color-mix(in srgb,var(--dwc-text) 16%,transparent);border-radius:12px;margin:0;overflow:hidden;background:var(--dsw-alias-bg-layer-1,color-mix(in srgb,var(--dwc-text) 4%,transparent))}.dwc-platform.open{border-color:color-mix(in srgb,var(--dwc-text) 24%,transparent)}
.dwc-platform-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-height:56px;padding:10px 16px;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.dwc-platform:not(.open):not(.empty) .dwc-platform-head:hover{background:var(--dwc-card-hover)}.dwc-platform.empty .dwc-platform-head{cursor:default}
.dwc-platform-head>.dwc-logo,.dwc-platform-head>.dwc-logo svg{width:24px;height:24px}
.dwc-platform-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}
.dwc-platform-meta{display:inline-flex;align-items:center;gap:10px}
.dwc-platform-count{color:var(--dwc-muted);font-size:12px;white-space:nowrap}
.dwc-platform-caret{display:grid;width:18px;height:18px;place-items:center;color:var(--dwc-muted);transition:transform .15s ease}.dwc-platform-caret.empty{visibility:hidden}.dwc-platform.open .dwc-platform-caret{transform:rotate(90deg)}
.dwc-account-list{display:flex;flex-direction:column;gap:8px;padding:0 14px 14px}
.dwc-account-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;align-items:center;gap:12px;width:100%;min-height:48px;padding:10px 12px;border:0;border-radius:8px;background:color-mix(in srgb,var(--dwc-text) 7%,transparent);color:inherit;text-align:left}
.dwc-account-row:hover{background:var(--dwc-card-hover)}
.dwc-platform-head:focus-visible,.dwc-account-row:focus-visible{outline:2px solid var(--dwc-accent);outline-offset:2px}
.dwc-account-copy{min-width:0}.dwc-account-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}.dwc-account-rename-button{width:100%;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:text}.dwc-account-rename-button:hover,.dwc-account-rename-button:focus-visible{color:var(--dwc-accent)}.dwc-account-rename,.dwc-account-remark-input{box-sizing:border-box;width:100%;height:32px;padding:4px 8px;border:1px solid var(--dwc-line);border-radius:6px;background:transparent;color:inherit;font:inherit}.dwc-account-id{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dwc-muted);font-size:11px}
.dwc-account-row .dwc-tag{margin-inline-end:0}
.dwc-account-receive{display:inline-flex;align-items:center;justify-content:flex-end;gap:8px;white-space:nowrap;font-size:12px;color:var(--dwc-muted)}
.dwc-inspector{padding:22px 24px 26px;min-width:0}.dwc-inspector-head{display:flex;align-items:flex-start;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--dwc-line)}.dwc-inspector-head-copy{min-width:0;flex:1}.dwc-inspector-title{margin:1px 0 3px;font-size:17px;line-height:24px}.dwc-inspector-title-row{display:flex;align-items:center;gap:12px;min-width:0}.dwc-inspector-title-row .dwc-inspector-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}.dwc-inspector-title-row .dwc-inspector-status{flex:none;white-space:nowrap;font-size:11px}.dwc-inspector-head-copy>.dwc-account-id{margin-top:5px}
.dwc-inspector-status{flex:none}
.dwc-form{display:flex;flex-direction:column;gap:16px;padding-top:20px}
.dwc-command-permissions{min-width:0;margin:0;padding:0;border:0}
.dwc-diagnostic-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dwc-inspector-title-row .dwc-tag{margin-inline-end:0}.dwc-bind-modal .dwc-feedback{margin-bottom:12px}.dwc-connection-check{display:grid;gap:6px;padding:12px;border:1px solid var(--dwc-line);border-radius:8px;font-size:12px;line-height:1.6;overflow-wrap:anywhere;color:var(--dwc-muted)}.dwc-connection-check strong{color:var(--dwc-text)}.dwc-diagnostic-item{padding:8px 0;border-top:1px solid var(--dwc-line)}
.dwc-inspector-actions{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin-top:16px!important;padding-top:16px!important;padding-bottom:4px!important}
.dwc-account-modal .dwc-inspector{padding:0 0 16px 0}
.dwc-bind-modal,.dwc-account-modal{width:min(720px,100%) !important;max-height:100%;min-height:0}
/* 宿主 Modal 只把 dialog 限制在视口内，内容区默认不滚动，长内容会被裁掉；
   把宿主的 content 区设为滚动容器，footer 保持在容器外可见。 */
.dwc-bind-modal>.dwc-modal-content,.dwc-account-modal>.dwc-modal-content{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.dwc-account-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;width:100%;box-sizing:border-box}
.dwc-account-settings.compact{grid-template-columns:1fr}
.dwc-picker-field{display:flex;min-width:0;width:100%;flex-direction:column;gap:6px;box-sizing:border-box}
.dwc-picker-field.wide,.dwc-picker-note,.dwc-model-effort{grid-column:1/-1}
.dwc-model-effort{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;min-width:0;width:100%;box-sizing:border-box}
.dwc-account-settings.compact .dwc-model-effort{grid-template-columns:1fr}
.dwc-picker-label{color:var(--dsw-alias-label-secondary,var(--dwc-muted));font-size:12px;font-weight:550;line-height:16px}
.dwc-picker-note{color:var(--dsw-alias-label-tertiary,var(--dwc-muted));font-size:11px;line-height:1.6;margin-top:2px}
.dwc-picker-note.warning{color:var(--dwc-warning)}
.dwc-save-note{color:var(--dwc-muted);font-size:11px}.dwc-save-note.ok{color:var(--dwc-ok)}
.dwc-bind-modal .dwc-setup-section{padding:16px!important;margin:0 0 16px!important;border-radius:var(--dsw-radius-md,12px)!important;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.04))!important;border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.06))!important}
.dwc-bind-ready{display:flex!important;flex-direction:column!important;align-items:center!important;gap:14px!important;padding:20px 16px!important;border-radius:var(--dsw-radius-md,12px)!important;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.04))!important;border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.06))!important}
.dwc-bind-ready .dwc-btn{min-width:140px!important;height:36px!important}
.dwc-account-picker{width:100%}
.dwc-enable-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3,#555);cursor:pointer}
.dwc-enable-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary)}
.dwc-enable-switch:disabled{cursor:default;opacity:.5}
.dwc-enable-switch:focus-visible{outline:var(--dsw-focus-ring-width,1px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dwc-enable-switch-thumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground,#fff);transition:transform 120ms ease;pointer-events:none}
.dwc-enable-switch[aria-checked=false] .dwc-enable-switch-thumb{background:var(--dsw-alias-switch-thumb,#fff)}
.dwc-enable-switch[aria-checked=true] .dwc-enable-switch-thumb{transform:translateX(16px)}
.dwc-form-menu{box-sizing:border-box;width:max(var(--dwc-menu-width,144px),144px)!important;min-width:max(var(--dwc-menu-width,144px),144px)!important;max-width:100%!important}
.dwc-menu-select-wrap,.dwc-menu-select-wrap > *,.dwc-menu-select-wrap span[class*="_root_"],.dwc-menu-select-wrap .dwc-menu-select-trigger,.dwc-account-picker{display:flex!important;width:100%!important;min-width:0!important;box-sizing:border-box!important}
.dwc-menu-select-trigger{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;width:100%!important;height:36px!important;padding:0 12px!important;border:0.5px solid var(--dsw-alias-border-l2,#494949)!important;border-radius:var(--dsw-radius-sm,8px)!important;background:var(--dsw-alias-bg-layer-1,transparent)!important;color:var(--dsw-alias-label-primary,#eee)!important;font:inherit!important;font-size:13px!important;cursor:pointer!important;user-select:none!important;box-sizing:border-box!important;transition:border-color 120ms ease,background 120ms ease!important}
.dwc-menu-select-trigger:hover:not(:disabled){border-color:var(--dsw-alias-border-l3,#666)!important;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))!important}
.dwc-menu-select-trigger.is-open{border-color:var(--dsw-alias-brand-primary,#4b7cff)!important;outline:var(--dsw-focus-ring-width,1px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4b7cff))!important}
.dwc-menu-select-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left}
.dwc-menu-select-arrow{flex:none;opacity:0.6}
.dwc-btn-spinner{display:inline-block;vertical-align:-2px;animation:dwc-spin 0.8s linear infinite}
@keyframes dwc-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.dwc-btn-danger{color:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important;border-color:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important}
.dwc-btn-danger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important;border-color:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important;background:rgba(239,68,68,.12)!important}
.dwc-btn-danger-primary,.dwc-btn-danger.dwc-btn-danger-primary{background:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important;border-color:var(--dsw-alias-state-error-primary,var(--dwc-danger))!important;color:#fff!important}
@container (max-width:480px){.dwc-account-row{grid-template-columns:minmax(0,1fr) auto auto;gap:8px;padding:10px}.dwc-account-receive>span{display:none}.dwc-platform-head{padding:10px 12px}.dwc-account-list{padding:0 12px 12px}}

.dwc-channel-page{display:flex;flex-direction:column;gap:10px;min-height:0;height:100%;box-sizing:border-box;padding:10px 14px 16px 3px;overflow:auto}
.dwc-channel-head{display:flex;align-items:center;justify-content:stretch;gap:8px;min-height:30px;padding:0 0 8px;flex:none;width:100%}
.dwc-channel-add{width:100%!important;height:30px!important;min-height:30px!important;padding:0 10px!important;border:0.5px solid var(--dsw-alias-border-l2,#494949)!important;border-radius:var(--dsw-radius-sm,8px)!important;background:var(--dsw-alias-bg-layer-1,transparent)!important;color:var(--dsw-alias-label-secondary,#b9b9b9)!important;font-size:12px!important;font-weight:500!important;box-shadow:none!important}
.dwc-channel-add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))!important;border-color:var(--dsw-alias-border-l3,#666)!important;color:var(--dsw-alias-label-primary,#eee)!important}
.dwc-channel-empty{display:flex;align-items:center;justify-content:center;min-height:120px;padding:18px;border:0.5px dashed var(--dsw-alias-border-l2,#494949);border-radius:var(--dsw-radius-md,12px);color:var(--dsw-alias-label-tertiary,#888);font-size:12px;line-height:1.6;text-align:center}
.dwc-channel-pending{padding:10px;border:0.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d29922) 35%,transparent);border-radius:var(--dsw-radius-md,12px);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d29922) 8%,transparent)}
.dwc-channel-pending-title{font-size:12px;font-weight:600;color:var(--dsw-alias-state-warn-primary,#d29922);margin-bottom:6px}
.dwc-channel-pending-row{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px}
.dwc-channel-pending-user{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#b9b9b9)}
.dwc-channel-accounts{display:flex;flex-direction:column;gap:8px;min-height:0}
.dwc-channel-account{border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,transparent);padding:7px 8px;display:flex;flex-direction:column;gap:5px;min-width:0}
.dwc-channel-account-head{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:nowrap}
.dwc-channel-account-copy{flex:1;min-width:90px;display:flex;flex-direction:column;gap:1px}
.dwc-channel-account-name{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#eee);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dwc-channel-account-actions{display:flex;align-items:center;gap:4px;flex:none;margin-left:auto}
.dwc-channel-account-head .dwc-tag{height:18px!important;min-height:18px!important;font-size:10px!important;line-height:16px!important;padding:0 6px!important}
.dwc-channel-settings{width:24px!important;height:24px!important;min-height:24px!important;padding:0!important;border:0!important;background:transparent!important;color:var(--dsw-alias-label-tertiary,#888)!important;box-shadow:none!important}
.dwc-channel-settings:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))!important;color:var(--dsw-alias-label-primary,#eee)!important}
.dwc-channel-sessions{display:flex;flex-direction:column;gap:1px;border-top:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.07));padding-top:5px}
.dwc-channel-session{display:flex;align-items:center;gap:8px;width:100%;min-width:0;border:0;background:transparent;color:inherit;text-align:left;padding:6px 7px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer;font:inherit;transition:background 120ms ease}
.dwc-channel-session:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.dwc-channel-session.is-current{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4b7cff) 14%,transparent);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary,#4b7cff)}
.dwc-channel-session.is-current .dwc-channel-session-title{color:var(--dsw-alias-label-primary,#eee);font-weight:600}
.dwc-channel-session-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary,#eee)}
.dwc-channel-session-time{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#888);white-space:nowrap}
.dwc-channel-account-empty{font-size:11px;color:var(--dsw-alias-label-tertiary,#888);line-height:1.5;padding:2px 1px}
.dwc-channel-name-field{margin-bottom:14px}
.dwc-channel-name-field .dwc-picker-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#eee)}
.dwc-app-info{display:flex;flex-direction:column;gap:7px;padding:0;border:0;border-radius:0;background:transparent;margin-bottom:10px}
.dwc-app-info-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#eee)}
.dwc-app-fields{display:grid;grid-template-columns:minmax(0,0.66fr) minmax(0,1.34fr);gap:14px;min-width:0}
.dwc-app-fields .dwc-picker-field{margin:0;min-width:0}
.dwc-app-fields .dwc-copy-row{min-width:0}
.dwc-app-fields .dwc-copy-row .dwc-btn{height:26px!important;padding:0 6px!important;font-size:10px!important;white-space:nowrap}
.dwc-app-info .dwc-picker-field{margin:0}.dwc-app-info .dwc-picker-label{font-size:10px;color:var(--dsw-alias-label-tertiary,#888)}
.dwc-copy-row{display:flex;align-items:center;gap:6px;min-width:0}
.dwc-copy-row .dwc-input{flex:1;min-width:0}
.dwc-copy-row .dwc-btn{flex:none;white-space:nowrap}
.dwc-app-warning{display:flex;align-items:center;gap:8px;justify-content:space-between;font-size:11px;line-height:1.5;color:var(--dsw-alias-state-warn-primary,#d29922)}
.dwc-app-warning .dwc-btn{flex:none;height:24px;padding:0 7px;font-size:10px}.dwc-app-warning a{color:var(--dsw-alias-brand-primary,#4b7cff);text-decoration:none;font-weight:600}.dwc-app-warning a:hover{text-decoration:underline}

.dwc-tab-inline{display:inline-flex;align-items:center;gap:5px;min-width:0}
.dwc-tab-brand{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:none;color:currentColor}
.dwc-tab-brand svg{width:14px;height:14px;display:block}
.dwc-check-section{display:flex;flex-direction:column;gap:8px;padding:10px 0 2px;border-top:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.dwc-check-head{display:flex;align-items:center;gap:8px}
.dwc-check-title{flex:1;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#b9b9b9)}
.dwc-check-toggle{height:24px!important;padding:0 7px!important;font-size:11px!important;color:var(--dsw-alias-label-tertiary,#888)!important}
.dwc-remote-composer{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,952px);margin:0 auto;padding:0 var(--dsh-composer-side-clearance,16px) 18px;display:flex;justify-content:center}
.dwc-remote-composer-card{box-sizing:border-box;width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-panel,20px);border:0.5px solid var(--dsw-alias-border-l2,#494949);background:var(--dsw-specific-input-major,var(--dsw-alias-bg-layer-1,#1b1b1b));box-shadow:var(--dsw-elevation-soft,0 4px 16px rgba(0,0,0,.12))}
.dwc-remote-composer-icon{width:28px;height:28px;flex:none;display:grid;place-items:center;border-radius:calc(var(--dsw-radius-sm,8px));background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-secondary,#b9b9b9)}
.dwc-remote-composer-icon svg{width:18px;height:18px;display:block}
.dwc-remote-composer-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dwc-remote-composer-title{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary,#eee)}
.dwc-remote-composer-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#888)}
.dwc-remote-model{display:flex;align-items:center;gap:6px;flex:none;min-width:0}
.dwc-remote-model-label{font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary,#888);white-space:nowrap}
.dwc-remote-model-value{box-sizing:border-box;max-width:260px;padding:5px 9px;border:0.5px solid var(--dsw-alias-border-l2,#494949);border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,#eee);font-size:13px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dwc-remote-model-missing{font-size:11px}
.dwc-remote-stop{flex:none;width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;border-radius:50%!important;background:#111!important;border:0.5px solid #333!important;color:#fff!important;margin-left:8px;box-shadow:none!important}
.dwc-remote-stop:hover:not(:disabled){background:#000!important;border-color:#444!important;color:#fff!important}
.dwc-remote-stop svg{fill:currentColor!important}
.dwc-remote-model-missing{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary,#888);white-space:nowrap}
@media (max-width:520px){.dwc-app-fields{grid-template-columns:minmax(0,1fr)}.dwc-remote-composer-card{flex-wrap:wrap}.dwc-remote-model{margin-left:auto}.dwc-remote-model-value{max-width:180px}}


.dwc-panel{box-sizing:border-box;display:flex;flex-direction:column;min-height:0;height:100%;width:100%;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,#eee)}
.dwc-panel-head{display:flex;align-items:flex-start;gap:16px;padding:22px 28px 16px;border-bottom:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));flex:none}
.dwc-panel-head-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dwc-panel-title{margin:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap;text-align:left}
.dwc-panel-title-name{font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.3px}
.dwc-panel-title-plugin{font-size:20px;line-height:28px;font-weight:600;letter-spacing:-.2px}
.dwc-panel-title-status{display:inline-flex;align-items:center;gap:6px;font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-state-success-primary,#0aa457)}
.dwc-panel-title-status.is-warning{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dwc-panel-title-status.is-error{color:var(--dsw-alias-state-error-primary,#f85149)}
.dwc-panel-title-status.is-idle{color:var(--dsw-alias-label-tertiary,#888)}
.dwc-panel-status-dot{width:7px;height:7px;flex:none;border-radius:50%;background:currentColor}
.dwc-panel-desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);text-align:left}
.dwc-panel-actions{flex:none;display:flex;align-items:center;gap:8px;padding-top:2px}
.dwc-panel-body{flex:1;min-height:0;overflow:auto;padding:18px 28px 28px;display:flex;flex-direction:column;gap:14px}
.dwc-panel .dwc-channel-empty{width:100%}
.dwc-panel .dwc-channel-pending{margin:0}
.dwc-empty-hero{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:40px 24px}
.dwc-empty-hero-icon{width:76px;height:76px;border-radius:22px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#07c160) 12%,transparent);color:var(--dsw-alias-brand-primary,#07c160)}
.dwc-empty-hero-icon svg{width:42px;height:42px;display:block}
.dwc-empty-hero-title{margin:0;font-size:18px;line-height:26px;font-weight:600}
.dwc-empty-hero-desc{margin:0;max-width:440px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary,#888)}
.dwc-empty-hero-add{height:40px!important;padding:0 20px!important;font-size:14px!important;margin-top:6px}
.dwc-panel .dwc-channel-account{padding:16px 18px;gap:12px;border-radius:16px}
.dwc-panel .dwc-channel-account-name{font-size:15px;line-height:22px}
.dwc-panel .dwc-logo{width:36px;height:36px;border-radius:11px}
.dwc-panel .dwc-logo svg{width:22px;height:22px;display:block}
.dwc-channel-meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888)}
.dwc-channel-meta strong{font-weight:600;color:var(--dsw-alias-label-secondary,#b9b9b9);word-break:break-all}
.dwc-panel-section-title{font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary,#b9b9b9);letter-spacing:.02em}
.dwc-panel .dwc-channel-sessions{display:flex;flex-direction:column;gap:2px;border-top:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));padding-top:10px}
.dwc-panel .dwc-channel-session{padding:9px 10px;border-radius:10px}
.dwc-panel .dwc-channel-session-title{font-size:13px}
.dwc-session-channel-icon{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary,#888)}
.dwc-session-channel-icon svg{width:14px;height:14px;display:block}
.dwc-panel-embed-body{flex:1;min-height:0;overflow:hidden;padding:0 28px 24px;display:flex;flex-direction:column;gap:12px}
.dwc-embed{flex:1;min-height:0;display:flex;flex-direction:column;border:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:16px;background:var(--dsw-alias-bg-layer-1,transparent);overflow:hidden}
.dwc-embed-head{flex:none;display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));background:var(--dsw-alias-bg-layer-1,transparent)}
.dwc-embed-title{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#eee);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dwc-embed-time{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#888);white-space:nowrap}
.dwc-embed-session-select{flex:none;min-width:160px;max-width:280px}
.dwc-embed-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dwc-embed-body > *{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
`;

    const TITLE_LINK_CSS = "@media(max-width:720px){.dwc-title-row{flex-wrap:wrap}}";

    let styleEl = null;
    const ensureStyle = () => {
      if (styleEl && styleEl.isConnected) {
        styleEl.setAttribute("data-plugin", "@cubeai/dsh-weixin-channel");
        return;
      }
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-plugin", "@cubeai/dsh-weixin-channel");
      styleEl.textContent = CSS + TITLE_LINK_CSS;
      document.head.appendChild(styleEl);
    };

    let requestHostSessionRefresh = () => {};
    let channelSessionIds = new Set();
    let channelSessionChannels = new Map();
    let channelMembershipRevision = 0;
    const channelMembershipListeners = new Set();
    function updateChannelMembership(groups) {
      const next = new Set();
      const channels = new Map();
      for (const group of groups) {
        for (const session of group.sessions || []) {
          next.add(session.sessionId);
          channels.set(String(session.sessionId), group.id);
        }
      }
      let changed = next.size !== channelSessionIds.size || [...next].some(id => !channelSessionIds.has(id));
      if (!changed) {
        for (const [id, channel] of channels) {
          if (channelSessionChannels.get(id) !== channel) { changed = true; break; }
        }
      }
      if (changed) {
        channelSessionIds = next;
        channelSessionChannels = channels;
        channelMembershipRevision += 1;
        for (const listener of channelMembershipListeners) listener();
      }
      try { requestHostSessionRefresh(changed); } catch { /* 下次频道轮询继续重试 */ }
    }
    /** IM 会话 ID 包含账号实例；接口映射兼容沿用普通 ID 的已接入会话。 */
    function channelIdOfSession(sessionId) {
      const value = String(sessionId || "");
      const mapped = channelSessionChannels.get(value);
      if (mapped) return mapped;
      if (!value.startsWith("dwc:")) return undefined;
      const rest = value.slice(3);
      const split = rest.indexOf(":");
      const instance = split > 0 ? rest.slice(0, split) : rest;
      const platform = instance.split("_", 1)[0];
      return platform || undefined;
    }
    /** 从 dwc:<account>:<kind>:... 中取出微信频道 id。 */
    function accountIdOfSession(sessionId) {
      const value = String(sessionId || "");
      if (!value.startsWith("dwc:")) return "";
      const rest = value.slice(4);
      const split = rest.indexOf(":");
      return split > 0 ? rest.slice(0, split) : "";
    }
    const isChannelSession = (id) => String(id).startsWith("dwc:") || channelSessionIds.has(String(id));
    const subscribeChannelMembership = (listener) => {
      channelMembershipListeners.add(listener);
      return () => channelMembershipListeners.delete(listener);
    };
    const channelMembershipSnapshot = () => channelMembershipRevision;

    /** 微信会话自动认领“微信频道”页签；其他插件的页签不抢。 */
    function sidebarTabForSession(currentId, extraTabs) {
      if (typeof currentId !== "string" || currentId === "") return null;
      if (isChannelSession(currentId)) return "weixin";
      const matched = (extraTabs || []).find((item) => item && item.matchSession && item.matchSession(currentId));
      if (matched && matched.id !== "schedule" && matched.id !== "channels") return matched.id;
      if (matched) return null;
      return "tasks";
    }

    function followSidebarTab(state, currentId, extraTabs) {
      const ready = !!(state && state.ready);
      const next = sidebarTabForSession(currentId, extraTabs);
      // 首个有效主会话只建立基线，不覆盖用户恢复的页签；空快照继续等待。
      if (!ready) return { ready: typeof currentId === "string" && currentId !== "", previousId: currentId, tab: null };
      if (typeof currentId !== "string" || currentId === "") return { ready: true, previousId: currentId, tab: null };
      if (currentId === state.previousId) return { ready: true, previousId: currentId, tab: null };
      return { ready: true, previousId: currentId, tab: next };
    }

    function resolveSidebarTab(tab, extraTabs) {
      return tab === "tasks" || tab === "weixin" || extraTabs.some((item) => item.id === tab) ? tab : "tasks";
    }

    function isHostNewSessionControl(label) {
      return /^(新会话|新建任务|New chat|New session)(?:\s+(?:Ctrl|Alt|Shift|Meta)(?:\+[^\s+]+)*)?$/i.test(String(label || "").trim());
    }

    const api = (path, opts) => {
      // 管理路由复用宿主登录 Cookie，不缓存账号状态或认证错误。
      const request = Object.assign({}, opts || {}, { credentials: "same-origin", cache: "no-store" });
      const method = String(request.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        request.headers = Object.assign({ "content-type": "application/json" }, request.headers || {}, { "x-dsh-weixin-channel-client": "1" });
        if (request.body === undefined) request.body = "{}";
      }
      return fetch(API_BASE + path, request).then((r) => r.json()).then((data) => {
        if (!request.signal?.aborted && data.ok && Array.isArray(data.groups)) updateChannelMembership(data.groups);
        return data;
      });
    };

    // One request and timer for all channel consumers. Schedule only after settlement.
    function createChannelRefreshStore(load) {
      const listeners = new Set();
      let flight = null, timer = null, latest = null, failures = 0, epoch = 0;
      const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
      const clearTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
      const notify = (data, error) => { for (const listener of listeners) listener(data, error); };
      const schedule = () => {
        clearTimer();
        if (listeners.size && visible()) timer = setTimeout(() => {
          timer = null;
          refresh().catch(() => undefined);
        }, Math.min(4000 * 2 ** failures, 60000));
      };
      function refresh() {
        if (flight) return flight.promise;
        clearTimer();
        const current = { controller: new AbortController(), promise: null };
        flight = current;
        current.promise = Promise.resolve().then(() => {
          current.controller.signal.throwIfAborted();
          return load(current.controller.signal);
        }).then(data => {
          if (flight !== current || current.controller.signal.aborted) return data;
          failures = data.ok ? 0 : failures + 1;
          latest = { data, error: null };
          notify(data, null);
          return data;
        }).catch(error => {
          if (flight === current && !current.controller.signal.aborted) {
            failures++;
            latest = { data: null, error };
            notify(null, error);
          }
          throw error;
        }).finally(() => {
          if (flight !== current) return;
          flight = null;
          schedule();
        });
        return current.promise;
      }
      // A mutation must fetch again after any pre-mutation request has settled.
      function invalidate() {
        const generation = epoch;
        return (flight ? flight.promise.catch(() => undefined) : Promise.resolve()).then(() => {
          if (generation === epoch) return refresh();
        });
      }
      const onVisibility = () => {
        clearTimer();
        if (visible() && listeners.size) refresh().catch(() => undefined);
      };
      function subscribe(listener) {
        listeners.add(listener);
        if (latest) listener(latest.data, latest.error);
        if (listeners.size === 1) {
          if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
          if (visible()) refresh().catch(() => undefined);
        }
        return () => {
          listeners.delete(listener);
          if (listeners.size) return;
          epoch++;
          clearTimer();
          if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
          if (flight) flight.controller.abort();
          flight = null;
          latest = null;
          failures = 0;
        };
      }
      return { subscribe, refresh, invalidate };
    }
    const channelRefresh = createChannelRefreshStore(signal => api("/channels", { signal }));

    const storedAccountSelection = () => {
      try { return window.localStorage.getItem(ACCOUNT_SELECTION_KEY) || ""; }
      catch { return ""; }
    };
    const rememberAccountSelection = (id) => {
      try {
        if (id) window.localStorage.setItem(ACCOUNT_SELECTION_KEY, id);
        else window.localStorage.removeItem(ACCOUNT_SELECTION_KEY);
      } catch { /* Local storage can be unavailable in restricted browser contexts. */ }
    };

    function BrandMark({ id, compact, mono, size }) {
      const svg = (viewBox, children) => h("svg", {
        viewBox,
        width: size || undefined,
        height: size || undefined,
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        "aria-hidden": "true",
      }, children);
      const tone = (color) => mono ? "currentColor" : color;
      if (id === "weixin") {
        const bigBubble = "M3 19C3 11.8 10.7 6 20.2 6S37.4 11.8 37.4 19s-7.7 13-17.2 13c-2 0-3.9-.2-5.7-.7L7 35.5l1.2-5.6C5.2 27.7 3 23.6 3 19Z";
        const smallBubble = "M22.5 31C22.5 25.6 28.2 21.2 35.2 21.2S47.9 25.6 47.9 31 42.2 40.8 35.2 40.8c-1.8 0-3.5-.3-5.1-.8L24.4 43l1.3-4.9C23.6 36.5 22.5 33.9 22.5 31Z";
        if (mono) {
          return svg("0 0 48 48", [
            h("path", { key: "bubble", d: bigBubble, fill: "currentColor", opacity: 0.5 }),
            h("path", { key: "bubble2", d: smallBubble, fill: "currentColor" }),
          ]);
        }
        return svg("0 0 48 48", [
          h("path", { key: "bubble", d: bigBubble, fill: tone("#07c160") }),
          h("path", { key: "bubble2", d: smallBubble, fill: tone("#0aa457") }),
          h("circle", { key: "eye1", cx: 13, cy: 17, r: 2.6, fill: "#fff" }),
          h("circle", { key: "eye2", cx: 24, cy: 17, r: 2.6, fill: "#fff" }),
          h("circle", { key: "eye3", cx: 32, cy: 29.5, r: 2, fill: "#fff" }),
          h("circle", { key: "eye4", cx: 41, cy: 29.5, r: 2, fill: "#fff" }),
        ]);
      }
      return svg("0 0 24 24", [
        h("circle", { key: "bg", cx: 12, cy: 12, r: 12, fill: tone("#8b949e") }),
      ]);
    }

    function Logo({ id, small }) {
      return h("div", { className: small ? "dwc-logo sm" : "dwc-logo", "data-brand": id, "aria-hidden": "true" }, h(BrandMark, { id, compact: small }));
    }

    function isRasterQr(value) {
      return typeof value === "string" && (/^data:image\//i.test(value) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(value));
    }

    function qrSrc(pairing) {
      if (!pairing) return "";
      if (isRasterQr(pairing.qrImage)) return pairing.qrImage;
      return "";
    }

    const SERVER_TEXT_KEYS = new Map([
      ["未知渠道", "server.unknownChannel"], ["渠道未配置", "server.channelUnconfigured"], ["会话不存在", "server.sessionMissing"],
      ["频道不存在", "server.accountMissing"], ["频道连接失败，请查看本机日志", "server.accountConnectFailed"], ["重新连接频道失败，请查看本机日志", "server.accountReconnectFailed"],
      ["频道名称不能超过 40 个字符", "server.remarkTooLong"], ["频道名称不能包含换行或控制字符", "server.remarkControl"],
      ["请选择提供商、模型、工作区或权限", "server.selectAccountSettings"], ["请选择提供商和模型", "server.selectModel"], ["请选择工作区", "server.selectWorkspace"], ["请先添加工作区", "server.createWorkspace"], ["请选择权限", "server.selectPermission"], ["凭据不足，无法启动渠道", "server.missingCredentials"],
      ["该渠道不支持扫码绑定", "server.qrUnsupported"], ["二维码已过期", "server.qrExpired"], ["扫码未完成", "server.qrIncomplete"],
      ["未授权：请管理员在设置 → 微信频道 中批准你的访问。", "server.accessDenied"],
      ["已有微信频道，请先删除现有频道后再添加", "server.channelExists"],
      ["未连接", "account.statusNotConnected"], ["已停止", "status.stopped"], ["长连接已建立", "status.longConnection"],
    ]);
    function serverText(value, t) {
      const text = value == null ? "" : String(value);
      const key = SERVER_TEXT_KEYS.get(text);
      if (key) return t(key);
      // Server adapters return diagnostics, not locale keys. Do not leak a
      // Chinese diagnostic into an English UI; the detailed value remains in
      // the server log while the browser gets a usable localized fallback.
      if (/[\u3400-\u9fff]/.test(text) && t("settings.label") === "WeChat Channel") return t("error.detailsInLog");
      return value;
    }
    async function copyText(value) {
      const text = String(value ?? "");
      if (!text) return false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch { /* fall through to the DOM fallback */ }
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
        area.remove();
        return ok;
      } catch { return false; }
    }

    function relativeTime(value, t) {
      const ms = Date.parse(value || "");
      if (!Number.isFinite(ms)) return "";
      const diff = Math.max(0, Date.now() - ms);
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return t("time.now");
      if (minutes < 60) return t("time.ago", { t: t("time.minutes", { n: minutes }) });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t("time.ago", { t: t("time.hours", { n: hours }) });
      const days = Math.floor(hours / 24);
      if (days < 30) return t("time.ago", { t: t("time.days", { n: days }) });
      const months = Math.floor(days / 30);
      if (months < 12) return t("time.ago", { t: t("time.months", { n: months }) });
      return t("time.ago", { t: t("time.years", { n: Math.floor(months / 12) }) });
    }

    function defaultChannelName(ch) {
      const count = Array.isArray(ch && ch.accounts) ? ch.accounts.length : 0;
      return `微信频道${Math.max(1, count + 1)}`;
    }

    function channelLabel(ch, t) {
      const key = "channel." + ch.id;
      const translated = t(key);
      return translated === key ? (ch.label || ch.id) : translated;
    }
    function accountLabel(account, t) {
      if (!account || !account.autoName) return account && (account.name || account.id) || "";
      return t("account.defaultName", {
        channel: channelLabel({ id: account.platform, label: account.platform }, t),
        count: account.nameOrdinal || 1,
      });
    }
    function fieldLabel(ch, field, t) {
      const key = "field." + ch.id + "." + field.key;
      const translated = t(key);
      return translated === key ? field.label : translated;
    }
    function hintOf(ch, t) {
      const key = "qr." + ch.id;
      const translated = t(key);
      return translated === key ? t("qr.default") : translated;
    }

    // 有 reflect 时只 probe，不能硬读未注入的官方导航服务，否则 Cordis 会挡住插件激活。
    function probeService(ctx, name) {
      if (!ctx) return undefined;
      const reflect = ctx.reflect;
      if (reflect && typeof reflect.get === "function") {
        try {
          const found = reflect.get(name);
          if (found !== undefined) return found;
        } catch { /* 未注入时不硬读 ctx[name]，改走 get */ }
      }
      if (typeof ctx.get === "function") {
        try {
          const found = ctx.get(name);
          if (found !== undefined) return found;
        } catch { return undefined; }
      }
      if (reflect && typeof reflect.get === "function") return undefined;
      try { return ctx[name]; } catch { return undefined; }
    }
    // 旧宿主读 list.current；alpha.2 主视图改由 retainedBy.mainView 标记。
    function currentSessionId(state) {
      if (!state) return null;
      if (typeof state.current === "string" && state.current) return state.current;
      const byId = state.byId || {};
      const ids = Array.isArray(state.ids) && state.ids.length ? state.ids : Object.keys(byId);
      const pick = (id, row) => {
        if (!row || !row.retainedBy || (row.retainedBy.mainView ?? 0) <= 0) return null;
        const explicit = row.id && String(row.id).trim();
        return explicit || id;
      };
      for (let i = 0; i < ids.length; i++) {
        const found = pick(ids[i], byId[ids[i]]);
        if (found) return found;
      }
      for (const id in byId) {
        if (ids.indexOf(id) !== -1) continue;
        const found = pick(id, byId[id]);
        if (found) return found;
      }
      return null;
    }
    function resolveHostSessionId(sessionId, sessionById) {
      if (!sessionId) return sessionId;
      const listed = sessionById && sessionById[sessionId];
      const fromKey = listed && (listed.id || listed.sessionId);
      if (fromKey && String(fromKey).trim()) return String(fromKey).trim();
      return sessionId;
    }

    function mainSessionModel(state) {
      const id = currentSessionId(state);
      const row = id && state && state.projectionsBySession && state.projectionsBySession[id];
      const selection = row && row.values && row.values.modelSelection;
      const next = selection && (selection.next || selection.lastUsed);
      if (!next || !next.provider || !next.model) return null;
      return { provider: next.provider, model: next.model, reasoningEffort: next.reasoningEffort || "" };
    }
    function readMainSessionModel(ctx) {
      const sessions = probeService(ctx, "sessions");
      const list = sessions && sessions.list;
      if (!list || typeof list.getSnapshot !== "function") return null;
      try { return mainSessionModel(list.getSnapshot()); } catch { return null; }
    }
    function openHostSession(ctx, id) {
      if (!id) return false;
      const uiWorkspace = (ctx && ctx.uiWorkspace) || probeService(ctx, "uiWorkspace");
      if (uiWorkspace && typeof uiWorkspace.openSession === "function") {
        uiWorkspace.openSession(id);
        return true;
      }
      // alpha.2 有 retain：旧的 sessions.open 即使还在也不会写入 mainView，点了等于没打开。
      if (ctx.sessions && typeof ctx.sessions.retain === "function") return false;
      if (ctx.sessions && typeof ctx.sessions.open === "function") {
        ctx.sessions.open(id);
        return true;
      }
      return false;
    }
    function parsePickedPath(value) {
      if (typeof value === "string" && value.trim() !== "") return value;
      if (value === null || typeof value !== "object") return undefined;
      if (value.canceled === true) return undefined;
      if (typeof value.path === "string" && value.path.trim() !== "") return value.path;
      const first = Array.isArray(value.filePaths) ? value.filePaths[0] : undefined;
      return typeof first === "string" && first.trim() !== "" ? first : undefined;
    }
    function pickHostDirectory(ctx) {
      const host = typeof globalThis !== "undefined" ? globalThis.__DSH_DIRECTORY_PICKER__ : undefined;
      if (host && typeof host.pick === "function") {
        return Promise.resolve(host.pick()).then(parsePickedPath);
      }
      const uiWorkspace = probeService(ctx, "uiWorkspace");
      if (uiWorkspace && typeof uiWorkspace.pickDirectory === "function") return Promise.resolve(uiWorkspace.pickDirectory()).then(parsePickedPath);
      const dialog = probeService(ctx, "dialog");
      if (dialog && typeof dialog.pickDirectory === "function") return Promise.resolve(dialog.pickDirectory()).then(parsePickedPath);
      if (ctx && ctx.workspaces && typeof ctx.workspaces.pickDirectory === "function") return Promise.resolve(ctx.workspaces.pickDirectory()).then(parsePickedPath);
      // 全部来源都不可用时必须显式拒绝：调用方据此提示“当前 Host 无法新增工作区”，
      // 否则点击“添加工作区…”会静默无响应（取消选择由 resolve(undefined) 表示，二者不能混淆）。
      return Promise.reject(workspacePickerUnavailable());
    }
    function workspacePickerUnavailable() {
      const error = new Error("workspace picker unavailable");
      error.code = "workspace/picker-unavailable";
      return error;
    }
    function hostWorkspaceApi(ctx) {
      return probeService(ctx, "uiWorkspace") || ctx.workspaces || {};
    }
    function archiveHostSession(ctx, id, options) {
      const api = hostWorkspaceApi(ctx);
      if (typeof api.archiveSession !== "function") return;
      return options ? api.archiveSession(id, options) : api.archiveSession(id);
    }
    function unarchiveHostSession(ctx, id) {
      const api = hostWorkspaceApi(ctx);
      if (typeof api.unarchiveSession === "function") return api.unarchiveSession(id);
      if (typeof api.restoreSession === "function") return api.restoreSession(id);
    }
    function forkHostSession(ctx, id) {
      const uiWorkspace = probeService(ctx, "uiWorkspace");
      if (uiWorkspace && typeof uiWorkspace.forkSession === "function") return Promise.resolve(uiWorkspace.forkSession(id));
      if (!ctx.sessions || typeof ctx.sessions.fork !== "function") return Promise.resolve();
      return ctx.sessions.fork({ sessionId: id, increaseTitle: true })
        .then((childId) => { openHostSession(ctx, childId); })
        .catch(() => undefined);
    }
    async function renameHostSession(ctx, sessionId, title) {
      const sessions = ctx.sessions;
      if (!sessions) throw new Error("unknown session");
      const renameBound = async (session) => {
        if (!session || typeof session.rename !== "function") throw new Error("unknown session");
        const result = await session.rename(title);
        if (result && result.ok === false) throw new Error((result.error && result.error.message) || "rename failed");
      };
      if (typeof sessions.using === "function") {
        return sessions.using(sessionId, { source: "controllerOperation" }, async (reference) => {
          if (reference && reference.ready) await reference.ready;
          return renameBound(reference && reference.binding && reference.binding.session);
        });
      }
      const existing = sessions.binding && sessions.binding(sessionId);
      if (existing && existing.session) return renameBound(existing.session);
      if (typeof sessions.retain !== "function") throw new Error("unknown session");
      const ref = sessions.retain(sessionId, { source: "controllerOperation" });
      try {
        if (ref && ref.ready) await ref.ready;
        return renameBound(ref && ref.binding && ref.binding.session);
      } finally {
        if (ref && typeof ref.release === "function") ref.release();
      }
    }

    let openImSession = (id) => {
      try {
        if (window.__dshSessionsOpen) { window.__dshSessionsOpen(id); return true; }
      } catch { /* ignore */ }
      return false;
    };
    const tryOpenListedSession = (id, hostOpen) => {
      if (openImSession(id)) return true;
      if (typeof hostOpen !== "function") return false;
      try { hostOpen(id); return true; } catch { return false; }
    };
    const openListedSession = (id, hostOpen) => {
      if (!id) return;
      if (isChannelSession(id)) {
        api("/sessions/ensure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        }).then((data) => {
          if (!data.ok) { console.warn("[dsh-weixin-channel] 无法恢复会话", data.error || id); return; }
          const tryOpen = (left) => {
            if (openImSession(id) || left <= 0) return;
            setTimeout(() => tryOpen(left - 1), 80);
          };
          tryOpen(20);
        }).catch((error) => console.warn("[dsh-weixin-channel] 无法恢复会话", id, error));
        return;
      }
      tryOpenListedSession(id, hostOpen);
    };

    function preferredAssistant(defaults, readModel) {
      const main = typeof readModel === "function" ? readModel() : null;
      if (main && main.provider && main.model) return main;
      const assistant = defaults && defaults.assistant;
      return assistant && assistant.provider && assistant.model ? assistant : null;
    }
    function selectableWorkspace(preferred, workspaces) {
      const items = Array.isArray(workspaces) ? workspaces : [];
      const key = (path) => {
        const value = String(path || "");
        const windows = /^[a-z]:[\\/]|^\\\\|^\/\//i.test(value);
        const normalized = (windows ? value.replace(/\\/g, "/") : value).replace(/\/+$/, "");
        return windows ? normalized.toLowerCase() : normalized;
      };
      const wanted = key(preferred);
      const matched = wanted && items.find((item) => item && key(item.path) === wanted);
      if (matched && matched.path) return matched.path;
      const first = items.find((item) => item && item.path);
            return first ? first.path : "";
                }
                function workspaceIsListed(cwd, workspaces) {
                  const items = Array.isArray(workspaces) ? workspaces : [];
                  const key = (path) => {
                    const value = String(path || "");
                    const windows = /^[a-z]:[\\/]|^\\\\|^\/\//i.test(value);
                    const normalized = (windows ? value.replace(/\\/g, "/") : value).replace(/\/+$/, "");
                    return windows ? normalized.toLowerCase() : normalized;
                  };
                  const wanted = key(cwd);
                  return Boolean(wanted && items.some((item) => item && key(item.path) === wanted));
                }
                function BindModal({ ch, onClose, onConnected, catalog, permissions, agentPresets, workspaces, defaults, readMainSessionModel, createWorkspace, pickDirectory, modelT, permissionT, presetT, t = fallbackT }) {
      const hasQr = ch.kind === "qr" || ch.kind === "qr-or-credentials";
      const hasManual = false;
      const showTabs = false;
      const [tab, setTab] = useState("qr");
      const [pairing, setPairing] = useState(null);
      const [qrStarted, setQrStarted] = useState(false);
      const [draft, setDraft] = useState({});
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [success, setSuccess] = useState("");
      const modelTouched = useRef(false);
      const workspaceTouched = useRef(false);
      const [settings, setSettings] = useState(() => {
        const assistant = preferredAssistant(defaults, readMainSessionModel);
        return {
          name: defaultChannelName(ch),
          cwd: selectableWorkspace(defaults && defaults.cwd, workspaces),
          provider: assistant && assistant.provider || "",
          model: assistant && assistant.model || "",
          reasoningEffort: assistant && assistant.reasoningEffort || "",
          permission: defaults && defaults.permission || "",
          privateAccess: "approved",
          sendMode: "queue",
          agentPreset: defaults && defaults.agentPreset || "standard",
        };
      });
      const alive = useRef(true);
      useEffect(() => {
        if (modelTouched.current) return;
        const assistant = preferredAssistant(defaults, readMainSessionModel);
        if (!assistant) return;
        setSettings((current) => current.provider === assistant.provider && current.model === assistant.model
          ? current
          : { ...current, provider: assistant.provider, model: assistant.model, reasoningEffort: assistant.reasoningEffort || "" });
      }, [defaults, readMainSessionModel]);
      useEffect(() => {
        if (workspaceTouched.current) return;
        const next = selectableWorkspace(defaults && defaults.cwd, workspaces);
        setSettings((current) => current.cwd === next ? current : { ...current, cwd: next });
      }, [defaults, workspaces]);

      const startQr = useCallback((refresh) => {
              if (!hasQr || !workspaceIsListed(settings.cwd, workspaces)) return;
        setQrStarted(true);
        setBusy(true);
        setError("");
        setSuccess("");
        api(`/channels/${ch.id}/qr/${refresh ? "refresh" : "start"}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ settings }),
        }).then((data) => {
          if (!alive.current) return;
          if (!data.ok && !data.pairing) setError(serverText(data.error, t) || t("error.qr"));
          setPairing(data.pairing || null);
        }).catch(() => { if (alive.current) setError(t("error.qr")); })
          .finally(() => { if (alive.current) setBusy(false); });
      }, [ch.id, hasQr, settings, workspaces]);

      useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
      }, []);

      const finished = useRef(false);
      const onConnectedRef = useRef(onConnected);
      onConnectedRef.current = onConnected;
      const finish = (delayMs) => {
        if (finished.current) return;
        finished.current = true;
        alive.current = false;
        window.setTimeout(() => onConnectedRef.current(), delayMs);
      };

      useEffect(() => {
        if (tab !== "qr" || !qrStarted) return undefined;
        const timer = setInterval(() => {
          api(`/channels/${ch.id}/qr/status`).then((data) => {
            if (finished.current || !alive.current || !data.ok) return;
            setPairing(data.pairing);
            if (data.pairing && data.pairing.status === "success") finish(800);
          }).catch(() => undefined);
        }, 2000);
        return () => clearInterval(timer);
      }, [tab, ch.id, qrStarted]);

      const status = qrStarted && pairing && pairing.status;
      const saving = status === "saving";
      const close = () => {
        if (finished.current || saving) return;
        alive.current = false;
        if (hasQr) api("/channels/" + ch.id + "/qr/cancel", { method: "POST" }).catch(() => undefined);
        onClose();
      };
      const onCloseRef = useRef(onClose);
      onCloseRef.current = onClose;
      useEffect(() => {
        const onKeyDown = (event) => {
          if (modalLayers.length && modalLayers[modalLayers.length - 1].owner !== "bind") return;
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
          if (saving) return;
          alive.current = false;
          if (hasQr) api("/channels/" + ch.id + "/qr/cancel", { method: "POST" }).catch(() => undefined);
          onCloseRef.current();
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
      }, [hasQr, ch.id, saving]);

      const saveManual = () => {
              if (!workspaceIsListed(settings.cwd, workspaces)) {
                setError(t("composer.workspaceRequired"));
                return;
              }
              const config = { ...draft };
        setBusy(true);
        setError("");
        setSuccess("");
        api(`/channels/${ch.id}/connect`, {
          method: "POST",
          headers: { "content-type": "application/json" },
           body: JSON.stringify({ config, settings }),
        }).then((data) => {
          if (!data.ok) setError(serverText(data.error, t) || t("error.save"));
          else {
            setSuccess(data.newIdentity ? t("bind.newIdentity") : t("bind.success"));
            finish(data.newIdentity ? 1400 : 500);
          }
        }).catch(() => setError(t("error.save"))).finally(() => setBusy(false));
      };

      const switchTab = (next) => {
        if (saving) return;
        setTab(next);
        setError("");
        setSuccess("");
        if (next !== "qr") {
          setQrStarted(false);
          setPairing(null);
          api(`/channels/${ch.id}/qr/cancel`, { method: "POST" }).catch(() => undefined);
        }
      };

      const src = qrStarted ? qrSrc(pairing) : "";
      const remain = qrStarted && pairing && pairing.remainingSeconds;

      return h(Modal, {
        open: true,
        className: "dwc-bind-modal",
        title: t("bind.title", { channel: channelLabel(ch, t) }),
        width: 720,
        zIndex: 1100,
        destroyOnHidden: true,
        layerOwner: "bind",
        maskClosable: !saving,
        onCancel: close,
        footer: tab === "manual" && hasManual
          ? h("div", { className: "dwc-modal-actions" },
              hostModalButton(t("action.cancel"), close, "outline", { disabled: busy }),
              hostModalButton(busy ? t("action.saving") : t("action.confirm"), saveManual, "primary", { disabled: busy || !workspaceIsListed(settings.cwd, workspaces) }),
            )
          : null,
      },
        showTabs && h("div", {
          className: ["dwc-bind-tabs-wrap", saving ? "is-disabled" : ""].filter(Boolean).join(" "),
          "aria-disabled": saving ? "true" : undefined,
        }, h(HostSegmentedTabs, {
          className: "dwc-bind-tabs",
          label: t("bind.tabsAria"),
          value: tab,
          onChange: (next) => switchTab(next),
          items: [
            { value: "qr", id: "dwc-bind-tab-qr", panelId: "dwc-bind-panel-qr", label: t("bind.quick") },
            { value: "manual", id: "dwc-bind-tab-manual", panelId: "dwc-bind-panel-manual", label: t("bind.manual") },
          ],
        })),
        error && h(NoticeBar, { type: "error" }, error),
        success && h(NoticeBar, { type: "success" }, success),
        h("label", { className: "dwc-field dwc-channel-name-field" },
          h("span", { className: "dwc-picker-label" }, t("account.channelName")),
          h(Input, {
            type: "text",
            value: settings.name || "",
            placeholder: defaultChannelName(ch),
            onChange: (event) => setSettings((current) => ({ ...current, name: event.target.value })),
          }),
        ),
        h("div", { className: "dwc-setup-section" },
          h(AccountSettingsPicker, {
            value: settings,
            onChange: (patch) => {
              if (patch && patch.cwd !== undefined) workspaceTouched.current = true;
              if (patch && (patch.provider !== undefined || patch.model !== undefined)) modelTouched.current = true;
              setSettings((current) => ({ ...current, ...patch }));
            },
            catalog,
            permissions,
            agentPresets,
            workspaces,
            createWorkspace,
            pickDirectory,
            modelT,
            permissionT,
            presetT,
            showAutoNameNote: false,
            t,
          }),
          h(CommandPermissionSettings, { value: settings.commandPermissions, onSave: commandPermissions => setSettings(current => ({ ...current, commandPermissions })), t }),
        ),
        hasQr && h("div", showTabs ? { className: "dwc-bind-panel", id: "dwc-bind-panel-qr", role: "tabpanel", "aria-labelledby": "dwc-bind-tab-qr", hidden: tab !== "qr" } : null,
          status === "success"
            ? h(NoticeBar, { type: "success" }, t("bind.success"))
            : status === "saving"
              ? h("div", { className: "dwc-bind-status" }, t("bind.saving"))
            : src
              ? h("div", { className: "dwc-qrbox" },
                h("p", { className: "dwc-hint" }, hintOf(ch, t)),
                h("img", { src, alt: t("bind.qrAlt", { channel: channelLabel(ch, t) }) }),
                remain > 0 && h("p", { className: "dwc-hint" }, t("bind.expire", { time: Math.floor(remain / 60) + ":" + String(remain % 60).padStart(2, "0") })),
                status === "scanned" && h("p", { className: "dwc-hint" }, t("bind.scanned")),
                (status === "expired" || status === "failed") && h("p", { className: "dwc-error" }, serverText(pairing && pairing.error, t) || t("bind.retry")),
                hostModalButton(t("bind.refresh"), () => startQr(true), "outline", { disabled: busy }),
              )
              : h("div", { className: "dwc-bind-ready" },
                  h("p", { className: "dwc-hint" }, hintOf(ch, t)),
                  (busy || status === "starting") && h("div", { className: "dwc-bind-status" }, t("bind.generating")),
                  (status === "expired" || status === "failed") && h("div", { className: "dwc-error" }, serverText(pairing && pairing.error, t) || t("bind.retry")),
                  hostModalButton(busy ? t("bind.generating") : qrStarted ? t("bind.refresh") : t("action.generateQr"), () => startQr(qrStarted), "primary", { disabled: busy || !workspaceIsListed(settings.cwd, workspaces) || !settings.provider || !settings.model || !settings.permission }),
                )
        ),
        hasManual && h("div", showTabs ? { className: "dwc-bind-panel", id: "dwc-bind-panel-manual", role: "tabpanel", "aria-labelledby": "dwc-bind-tab-manual", hidden: tab !== "manual" } : null,
          ...ch.fields.filter((f) => !f.settingsOnly).map((f) => h("label", { key: f.key, className: "dwc-field" },
            fieldLabel(ch, f, t),
            h(Input, {
              type: f.secret ? "password" : "text",
              value: draft[f.key] || "",
              placeholder: fieldLabel(ch, f, t),
              onChange: (e) => setDraft({ ...draft, [f.key]: e.target.value }),
            }),
          )),
        ),
      );
    }

    const BUILT_IN_PERMISSION_LABELS = new Map([
      ["read-only", ["permission.readOnly", "Read Only"]],
      ["workspace-write", ["permission.workspaceWrite", "Workspace Write"]],
      ["danger-full-access", ["permission.fullAccess", "Full access"]],
    ]);

    function permissionLabel(option, t) {
      const builtIn = BUILT_IN_PERMISSION_LABELS.get(option.value);
      if (builtIn && (option.name === option.value || option.name === builtIn[1])) return t(builtIn[0]);
      return option.name || option.value;
    }

    // 与宿主 settings.agentPreset 一致：内置预设没有自报名称时走官方词条。
    const BUILT_IN_PRESET_KEYS = {
      standard: { name: "presetStandardName", description: "presetStandardDescription" },
      ptc: { name: "presetPtcName", description: "presetPtcDescription" },
      minimal: { name: "presetMinimalName", description: "presetMinimalDescription" },
      cordis: { name: "presetCordisName", description: "presetCordisDescription" },
    };
    function presetDisplayText(preset, presetT) {
      const keys = BUILT_IN_PRESET_KEYS[preset.id];
      if (keys && (preset.name === undefined || preset.name === "" || preset.name === preset.id)) {
        return { name: presetT(keys.name), description: presetT(keys.description) };
      }
      return { name: preset.name || preset.id, description: preset.description };
    }
    function PlusIcon() {
      return h(IconPlusOutline, { size: 14 });
    }

    function formatProviderLabel(provider, defaultLabel, modelT) {
      if (provider === "deepseek-account") {
        const localized = modelT("provider.account");
        if (localized && localized !== "provider.account") return localized;
      }
      return defaultLabel;
    }

    function orderProviders(left, right) {
      const leftRank = left === "deepseek-account" ? 0 : left === "deepseek-official" ? 1 : 2;
      const rightRank = right === "deepseek-account" ? 0 : right === "deepseek-official" ? 1 : 2;
      return leftRank - rightRank;
    }

    function renderModelOptionLabel(item) {
      const isOfficialFlash = (item.provider === "deepseek-account" || item.provider === "deepseek-official") && item.model === "deepseek-flash";
      if (!isOfficialFlash) return item.label;
      return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
        React.createElement("span", null, item.label),
        React.createElement(Tag, { color: "info" }, "1017")
      );
    }

    function AccountSettingsPicker(props) {
      const t = props.t || fallbackT;
      const modelT = props.modelT || ((key) => key);
      const permissionT = props.permissionT || ((key) => key);
      const presetT = props.presetT || ((key) => key);
      const value = props.value || {};
      const [addBusy, setAddBusy] = useState(false);
      const [hint, setHint] = useState("");
      const [confirmingFullAccess, setConfirmingFullAccess] = useState(false);
      const [fullAccessAcknowledged, setFullAccessAcknowledged] = useState(false);
      const items = props.workspaces || [];
      const providers = props.catalog || [];
      const permissions = props.permissions || [];
      const provider = value.provider || (value.assistant && value.assistant.provider) || "";
      const model = value.model || (value.assistant && value.assistant.model) || "";
      const effort = value.reasoningEffort || (value.assistant && value.assistant.reasoningEffort) || "";
      const cwd = value.cwd || "";
      const permission = value.permission || "";
      const privateAccess = value.privateAccess === "all" ? "all" : "approved";
      const sendMode = value.sendMode === "steer" ? "steer" : "queue";
      const workspace = items.find((item) => item.path === cwd);
      const modelGroups = providers.map((item) => {
        const providerName = formatProviderLabel(item.id, item.name || item.id, modelT);
        return {
          id: item.id,
          name: providerName,
          models: (item.models || []).map((entry) => ({
            value: item.id + "::" + entry.id,
            provider: item.id,
            providerName: providerName,
            model: entry.id,
            label: entry.name || entry.id,
            description: entry.description,
            reasoning: entry.reasoning,
          })),
        };
      }).filter((item) => item.models.length > 0).sort((left, right) => orderProviders(left.id, right.id));
      const models = modelGroups.flatMap((item) => item.models);
      const currentModel = models.find((item) => item.provider === provider && item.model === model);
      const reasoning = currentModel && currentModel.reasoning;
      const effectiveEffort = effort || (reasoning && reasoning.defaultEffort) || "";
      const efforts = reasoning
        ? [
            ...(reasoning.defaultEffort ? [] : [{ id: "", name: modelT("effort.providerDefault") }]),
            ...((reasoning.efforts || []).map((item) => ({ id: item.id, name: item.name || item.id, description: item.description }))),
          ]
        : [];
      const effortLabel = reasoning
        ? ((efforts.find((item) => item.id === effectiveEffort) || {}).name || effectiveEffort || modelT("effort.providerDefault"))
        : "";
      const permissionOptions = permissions.map((item) => ({ ...item, label: permissionLabel(item, t) }));
      const currentPermission = permissionOptions.find((item) => item.value === permission);
      const update = (patch) => {
        setHint("");
        if (typeof props.onChange === "function") props.onChange(patch);
      };

      const addWorkspace = (path) => {
        const next = (path || "").trim();
        if (!next) { setHint(t("error.chooseWorkspace")); return Promise.resolve(); }
        if (typeof props.createWorkspace !== "function") { setHint(t("error.workspaceUnavailable")); return Promise.resolve(); }
        setAddBusy(true);
        return Promise.resolve(props.createWorkspace({ path: next })).then((created) => {
          const cwdPath = (created && (created.path || created.cwd)) || next;
          update({ cwd: cwdPath });
        }).catch((error) => setHint((error && error.message) || t("error.addWorkspace")))
          .finally(() => setAddBusy(false));
      };
      const onAddWorkspace = () => {
        setHint("");
        if (typeof props.pickDirectory !== "function") {
          setHint(t("error.workspaceUnavailable"));
          return Promise.resolve();
        }
        setAddBusy(true);
        return Promise.resolve()
          .then(() => props.pickDirectory())
          .then((picked) => {
            if (typeof picked === "string" && picked.trim()) {
              return addWorkspace(picked);
            }
          })
          .catch((error) => {
            setHint(error && error.code === "workspace/picker-unavailable"
              ? t("error.workspaceUnavailable")
              : (error && error.message) || t("error.addWorkspace"));
          })
          .finally(() => {
            setAddBusy(false);
          });
      };
      const selectPermission = (next) => {
        if (next === permission) return;
        if (next === "danger-full-access") {
          setFullAccessAcknowledged(false);
          setConfirmingFullAccess(true);
          return;
        }
        update({ permission: next });
      };
      const field = (key, label, picker, wide) => h("div", { key, className: "dwc-picker-field" + (wide ? " wide" : "") },
        h("span", { className: "dwc-picker-label" }, label),
        picker,
      );

      return h("div", { className: "dwc-account-settings" + (props.compact ? " compact" : "") },
        field("workspace", props.workspaceLabel || t("account.workspace"), items.length === 0
          ? h("div", null,
              h(Button, { variant: "primary", icon: h(PlusIcon), disabled: addBusy, onClick: onAddWorkspace }, t("composer.addWorkspace")),
              h("div", { className: "dwc-picker-note warning" }, t("composer.workspaceRequired")),
            )
          : h(Select, {
          className: "dwc-account-picker dwc-workspace-picker",
          value: cwd || undefined,
          placeholder: t("account.selectWorkspace"),
          "aria-label": props.workspaceLabel || t("account.workspace"),
          popupMatchSelectWidth: false,
          options: items.map((item) => ({ value: item.path, label: item.title || item.path })),
          footer: [{ value: "add-workspace", label: t("composer.addWorkspace"), disabled: addBusy }],
          onFooter: () => { onAddWorkspace(); },
          notFoundContent: t("composer.noWorkspaces"),
          onChange: (next) => update({ cwd: next }),
        })),
        field("agentPreset", presetT("nav"), h(Select, {
          className: "dwc-account-picker",
          value: value.agentPreset || undefined,
          "aria-label": presetT("nav"),
          options: (props.agentPresets || []).map((item) => {
            const copy = presetDisplayText(item, presetT);
            return {
              value: item.id,
              label: copy.name,
              disabled: !!item.broken,
              title: item.broken ? t("account.presetUnavailable") : copy.description,
            };
          }),
          onChange: (next) => update({ agentPreset: next }),
        })),
        h("div", { key: "model-effort", className: "dwc-model-effort" },
          field("model", modelT("menu.model"), h(Select, {
            className: "dwc-account-picker dwc-model-select",
            value: currentModel ? currentModel.value : undefined,
            placeholder: t("account.selectModel"),
            title: currentModel && currentModel.label,
            "aria-label": modelT("trigger.selectAria"),
            popupMatchSelectWidth: false,
            options: modelGroups.map((group) => ({
              label: group.name,
              options: group.models.map((item) => ({ value: item.value, label: renderModelOptionLabel(item) })),
            })),
            notFoundContent: modelT("empty.models"),
            onChange: (next) => {
              const item = models.find((entry) => entry.value === next);
              if (!item) return;
              update({ provider: item.provider, model: item.model, reasoningEffort: (item.reasoning && item.reasoning.defaultEffort) || "" });
            },
          })),
          reasoning && field("effort", modelT("menu.effort"), h(Select, {
            className: "dwc-account-picker",
            value: effectiveEffort,
            "aria-label": modelT("menu.effort"),
            options: efforts.map((item) => ({ value: item.id, label: item.name })),
            onChange: (next) => update({ provider, model, reasoningEffort: next }),
          })),
        ),
        field("permission", t("composer.permission"), h(Select, {
          className: "dwc-account-picker",
          value: permission || undefined,
          placeholder: t("account.selectPermission"),
          "aria-label": t("composer.permission"),
          options: permissionOptions.map((item) => ({ value: item.value, label: item.label })),
          onChange: selectPermission,
        })),
        field("private", t("account.privateAccess"), h(Select, {
          className: "dwc-account-picker",
          value: privateAccess,
          "aria-label": t("account.privateAccess"),
          options: [
            { value: "approved", label: t("account.privateApproved") },
            { value: "all", label: t("account.privateAll") },
          ],
          onChange: (next) => update({ privateAccess: next }),
        })),
        field("sendMode", t("account.sendMode"), h(Select, {
          className: "dwc-account-picker",
          value: sendMode,
          "aria-label": t("account.sendMode"),
          options: [
            { value: "queue", label: t("account.sendQueue") },
            { value: "steer", label: t("account.sendSteer") },
          ],
          onChange: (next) => update({ sendMode: next }),
        })),
        h("div", { className: "dwc-picker-note" }, t("account.presetNote")),
        sendMode === "steer" && h("div", { className: "dwc-picker-note" }, t("account.sendSteerNote")),
        privateAccess === "all" && h("div", { className: "dwc-picker-note warning" }, t("settings.publicChatNotice")),
        hint && h("div", { className: "dwc-picker-note" }, hint),
        props.showAutoNameNote && h("div", { className: "dwc-picker-note" }, t("account.autoNameNote")),
        h(Modal, {
          open: confirmingFullAccess,
          layerOwner: "full-access",
          title: permissionT("confirm.title"),
          keyboard: false,
          maskClosable: false,
          okText: permissionT("confirm.enable"),
          cancelText: permissionT("confirm.cancel"),
          okButtonProps: { disabled: !fullAccessAcknowledged },
          onCancel: () => { setFullAccessAcknowledged(false); setConfirmingFullAccess(false); },
          onOk: () => {
            if (!fullAccessAcknowledged) return;
            update({ permission: "danger-full-access" });
            setFullAccessAcknowledged(false);
            setConfirmingFullAccess(false);
          },
        },
          h("p", null, permissionT("confirm.description")),
          h(Checkbox, { checked: fullAccessAcknowledged, onChange: (event) => setFullAccessAcknowledged(event.target.checked) }, permissionT("confirm.acknowledge")),
        ),
      );
    }

    // 与账号配置共用两列网格和 Ant 下拉，私聊与群聊分别保存。
    function CommandPermissionSettings({ value, onSave, t }) {
      const policy = value || { dm: { enabled: true, users: [] }, group: { enabled: true, users: [] } };
      return h("div", { className: "dwc-command-permissions dwc-account-settings" },
        ...["dm", "group"].map(kind => h("div", { key: kind, className: "dwc-picker-field" },
          h("span", { className: "dwc-picker-label" }, t("command." + kind)),
          h(Select, {
            className: "dwc-account-picker",
            value: policy[kind].enabled ? "on" : "off",
            "aria-label": t("command." + kind),
            options: [
              { value: "on", label: t("command.enabled") },
              { value: "off", label: t("command.disabled") },
            ],
            onChange: (next) => onSave({ dm: { enabled: policy.dm.enabled, users: [] }, group: { enabled: policy.group.enabled, users: [] }, [kind]: { enabled: next === "on", users: [] } }),
          }))));
    }

    function AccountConnectionCheck({ account, t }) {
      const diagnostics = account.diagnostics;
      return h("div", { className: "dwc-connection-check", role: "status", "aria-live": "polite" },
        h("strong", null, t("diagnostic.title")),
        h("div", null, t("connection.checkedAt") + ": ", h("time", { dateTime: diagnostics.checkedAt }, new Date(diagnostics.checkedAt).toLocaleString(t("settings.label") === "WeChat Channel" ? "en-US" : "zh-CN"))),
        diagnostics.checks.map(item => h("div", { className: "dwc-diagnostic-item", key: item.id },
          h("div", { className: "dwc-diagnostic-head" },
            h("strong", null, t("diagnostic." + item.id)),
            h(Tag, { color: item.status === "passed" ? "success" : item.status === "failed" ? "error" : "warning" }, t("diagnostic." + item.status)),
          ),
          h("div", null, t("diagnostic." + item.reason)),
          h("small", null, [item.durationMs == null ? null : item.durationMs + " ms", item.httpStatus == null ? null : "HTTP " + item.httpStatus, item.platformCode == null ? null : "Code " + item.platformCode].filter(Boolean).join(" · ")),
        )),
        h("div", null, t(account.receiveConfigured === true ? "connection.receiveOn" : account.receiveConfigured === false ? "connection.receiveOff" : "connection.receiveUnknown")),
        h("div", null, t("diagnostic.scope")),
      );
    }

    function AccountInspector({ account, catalog, permissions, agentPresets, workspaces, createWorkspace, pickDirectory, modelT, permissionT, presetT, t, onAction, onSave, busy }) {
      const [modal, modalHolder] = Modal.useModal();
      const [draft, setDraft] = useState(account);
      const [note, setNote] = useState("");
      const [checkResult, setCheckResult] = useState(null);
      const [checkFailed, setCheckFailed] = useState(false);
      const [checking, setChecking] = useState(false);
      const [checkOpen, setCheckOpen] = useState(true);
      const checkRequest = useRef(0);
      const checkPending = useRef(false);
      useEffect(() => {
        checkRequest.current += 1;
        checkPending.current = false;
        setCheckResult(null);
        setCheckFailed(false);
        setChecking(false);
        setCheckOpen(true);
        return () => { checkRequest.current += 1; };
      }, [account.id]);
      const check = async () => {
        if (checkPending.current) return;
        checkPending.current = true;
        const request = ++checkRequest.current;
        setChecking(true);
        setCheckResult(null);
        setCheckFailed(false);
        try {
          const result = await onAction(account.id, "check");
          if (request === checkRequest.current) {
            if (result && result.account && result.diagnostics?.version === 1 && Array.isArray(result.diagnostics.checks) && result.diagnostics.checks.length) {
              setCheckResult({ ...result.account, diagnostics: result.diagnostics });
              setCheckOpen(true);
            }
            else if (result && result.account) setCheckFailed("connection.restartRequired");
            else setCheckFailed(true);
          }
        } catch {
          if (request === checkRequest.current) setCheckFailed(true);
        } finally {
          if (request === checkRequest.current) { checkPending.current = false; setChecking(false); }
        }
      };
      const saveSeq = useRef(0);
      useEffect(() => {
        saveSeq.current += 1;
        setDraft(account);
        setNote("");
      }, [account.id, account.cwd, account.permission, account.agentPreset, account.privateAccess, account.sendMode, JSON.stringify(account.commandPermissions), account.receiveEnabled, account.assistant && account.assistant.provider, account.assistant && account.assistant.model, account.assistant && account.assistant.reasoningEffort]);
      const save = (patch) => {
        const seq = ++saveSeq.current;
        const next = { ...draft, ...patch };
        setDraft(next);
        setNote("status.saving");
        const payload = {
          name: next.name,
          cwd: next.cwd,
          provider: next.assistant.provider,
          model: next.assistant.model,
          reasoningEffort: next.assistant.reasoningEffort || null,
          permission: next.permission,
          privateAccess: next.privateAccess,
          sendMode: next.sendMode,
          agentPreset: next.agentPreset,
          commandPermissions: next.commandPermissions,
        };
        return onSave(account.id, payload).then((ok) => {
          if (seq === saveSeq.current) setNote(ok ? "status.saved" : "error.save");
          return ok;
        });
      };
      const applySettings = (patch) => {
        const hasAssistant = Object.prototype.hasOwnProperty.call(patch, "provider") || Object.prototype.hasOwnProperty.call(patch, "model") || Object.prototype.hasOwnProperty.call(patch, "reasoningEffort");
        if (!hasAssistant) return save(patch);
        const assistant = {
          ...(draft.assistant || {}),
          ...(Object.prototype.hasOwnProperty.call(patch, "provider") ? { provider: patch.provider } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, "model") ? { model: patch.model } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, "reasoningEffort") ? { reasoningEffort: patch.reasoningEffort || undefined } : {}),
        };
        return save({ assistant });
      };
      return h("div", { className: "dwc-inspector" },
        modalHolder,
        h("div", { className: "dwc-inspector-head" },
          h(Logo, { id: account.platform }),
          h("div", { className: "dwc-inspector-head-copy" },
            h("div", { className: "dwc-inspector-title-row" },
            h("h3", { className: "dwc-inspector-title" }, accountLabel(account, t)),
            h("div", { className: account.connectionState === "connected" ? "dwc-inspector-status ok" : "dwc-inspector-status" }, h(Tag, {
              color: account.receiveConfigured === false ? "warning" : account.connectionState === "connected" ? "success" : "warning",
              bordered: false,
            }, t(account.receiveConfigured === false ? "connection.paused" : "connection." + (account.connectionState || "unknown")))),
            ),
          ),
        ),
        h("div", { className: "dwc-form" },
          h("div", { className: "dwc-picker-field" },
            h("span", { className: "dwc-picker-label" }, t("account.remark")),
            h(AccountRemarkEditor, { account, t, always: true, disabled: Boolean(busy), onSave: (name) => save({ name }) }),
          ),
          h(AccountSettingsPicker, {
            value: draft,
            onChange: applySettings,
            catalog,
            permissions,
            agentPresets,
            workspaces,
            createWorkspace,
            pickDirectory,
            modelT,
            permissionT,
            presetT,
            workspaceLabel: t("account.currentWorkspace"),
            t,
          }),
          h(CommandPermissionSettings, { value: draft.commandPermissions, onSave: commandPermissions => save({ commandPermissions }), t }),
          note && h("div", { className: note === "status.saved" ? "dwc-save-note ok" : "dwc-save-note" }, t(note)),
          h("div", { className: "dwc-inspector-actions" },
            h(Button, { variant: "outline", disabled: Boolean(busy) || checking, onClick: check }, t(checking ? "connection.checking" : "action.checkConnection")),
            h(Button, { variant: "outline", disabled: Boolean(busy) || checking, onClick: () => { setCheckResult(null); return onAction(account.id, "reconnect"); } }, t("action.reconnectAccount")),
            h(Button, { variant: "outline", danger: true, disabled: Boolean(busy) || checking, onClick: () => {
              modal.confirm({
                title: t("action.removeAccount"),
                description: t("account.removeConfirm"),
                okText: t("action.removeAccount"),
                cancelText: t("action.cancel"),
                okButtonProps: { danger: true },
                onOk: () => onAction(account.id, "remove"),
              });
            } }, t("action.removeAccount")),
          ),
          checkResult && h("div", { className: "dwc-check-section" },
            h("div", { className: "dwc-check-head" },
              h("span", { className: "dwc-check-title" }, t("connection.diagnostics")),
              h(Button, {
                size: "sm",
                variant: "ghost",
                className: "dwc-check-toggle",
                icon: h(checkOpen ? IconChevronDownOutline : IconChevronRightOutline, { size: 13 }),
                onClick: () => setCheckOpen((open) => !open),
              }, t(checkOpen ? "action.collapse" : "action.expand")),
            ),
            checkOpen && h(AccountConnectionCheck, { account: checkResult, t }),
          ),
          checkFailed && h(NoticeBar, { type: "error", role: "alert" }, t(typeof checkFailed === "string" ? checkFailed : "connection.checkFailed")),
        ),
      );
    }

    function AccountRemarkEditor(props) {
      const account = props.account;
      const t = props.t;
      const display = accountLabel(account, t);
      const stored = account.autoName ? "" : (account.name || "");
      const [draft, setDraft] = useState(stored);
      const [editing, setEditing] = useState(Boolean(props.always));
      const skipCommit = useRef(false);
      useEffect(() => {
        setDraft(account.autoName ? "" : (account.name || ""));
        if (!props.always) setEditing(false);
      }, [account.id, account.name, account.autoName, props.always]);
      const commit = () => {
        if (skipCommit.current) {
          skipCommit.current = false;
          return;
        }
        const next = draft.trim();
        const current = account.autoName ? "" : (account.name || "");
        if (next === current) {
          if (!props.always) setEditing(false);
          return;
        }
        Promise.resolve(props.onSave(next)).then((ok) => {
          if (!ok) setDraft(current);
          if (!props.always) setEditing(false);
        });
      };
      if (!props.always && !editing) {
        return h("button", {
          type: "button",
          className: "dwc-account-name dwc-account-rename-button",
          title: t("account.rename"),
          "aria-label": display + " · " + t("account.rename"),
          disabled: Boolean(props.disabled),
          onClick: (event) => { event.stopPropagation(); setEditing(true); },
        }, display);
      }
      return h("input", {
        type: "text",
        className: props.always ? "dwc-account-remark-input" : "dwc-account-rename",
        autoFocus: !props.always,
        maxLength: 40,
        value: draft,
        placeholder: display,
        "aria-label": t("account.remark"),
        disabled: Boolean(props.disabled),
        onClick: (event) => event.stopPropagation(),
        onMouseDown: (event) => event.stopPropagation(),
        onChange: (event) => setDraft(event.target.value),
        onBlur: commit,
        onKeyDown: (event) => {
          if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === "Escape" && !props.always) {
            event.preventDefault();
            event.stopPropagation();
            skipCommit.current = true;
            setDraft(stored);
            setEditing(false);
          }
        },
      });
    }

    function WeixinRemoteModelSelect({ sessionId, t }) {
      const accountId = accountIdOfSession(sessionId);
      const [accounts, setAccounts] = useState([]);
      useEffect(() => channelRefresh.subscribe((data) => {
        if (!data || !data.ok) return;
        setAccounts((data.channels || []).flatMap((channel) => channel.accounts || []));
      }), []);
      if (!accountId) return h("span", { className: "dwc-remote-model-missing" }, t("composer.modelUnavailable"));
      const account = accounts.find((item) => item.id === accountId);
      if (!account) return h("span", { className: "dwc-remote-model-missing" }, t("composer.modelLoading"));
      const assistant = account.assistant || {};
      const label = assistant.provider && assistant.model
        ? String(assistant.provider) + " / " + String(assistant.model)
        : "";
      if (!label) return h("span", { className: "dwc-remote-model-missing" }, t("composer.modelUnavailable"));
      return h("div", { className: "dwc-remote-model", title: t("composer.modelReadOnly") },
        h("span", { className: "dwc-remote-model-label" }, t("composer.model")),
        h("span", { className: "dwc-remote-model-value" }, label),
      );
    }

    function WeixinStopButton({ ctx, sessionId, useSession, t }) {
      const running = useSession((state) => Boolean(state && state.running));
      const [modal, modalHolder] = Modal.useModal();
      if (!running) return null;
      const cancel = async () => {
        const scoped = ctx && ctx.sessions && typeof ctx.sessions.scope === "function"
          ? ctx.sessions.scope(sessionId)
          : undefined;
        const conversation = scoped && typeof scoped.get === "function"
          ? scoped.get("conversation")
          : undefined;
        if (conversation && typeof conversation.cancel === "function") {
          await conversation.cancel();
          return;
        }
        if (ctx && ctx.sessions && typeof ctx.sessions.cancel === "function") {
          await ctx.sessions.cancel(sessionId);
          return;
        }
        throw new Error("session cancel unavailable");
      };
      const requestStop = () => {
        modal.confirm({
          title: t("composer.stopTitle"),
          description: t("composer.stopDescription"),
          okText: t("composer.stopConfirm"),
          cancelText: t("action.cancel"),
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              await cancel();
            } catch (error) {
              console.warn("[dsh-weixin-channel] 无法停止推理", error);
            }
          },
        });
      };
      return h(React.Fragment, null,
        modalHolder,
        h(Button, {
          size: "sm",
          variant: "outline",
          className: "dwc-remote-stop",
          icon: h(IconStopFill, { size: 12 }),
          "aria-label": t("composer.stopConfirm"),
          title: t("composer.stopConfirm"),
          onClick: requestStop,
        }),
      );
    }

    function WeixinComposerGuard(props) {
      const t = props.t || fallbackT;
      return h("div", { className: "dwc-remote-composer", "data-dwc-composer-guard": "1", role: "group", "aria-label": t("composer.remoteTitle") },
        h("div", { className: "dwc-remote-composer-card" },
          h("div", { className: "dwc-remote-composer-icon", "aria-hidden": "true" }, h(BrandMark, { id: "weixin", compact: true, mono: true })),
          h("div", { className: "dwc-remote-composer-copy" },
            h("div", { className: "dwc-remote-composer-title" }, t("composer.remoteTitle")),
            h("div", { className: "dwc-remote-composer-hint" }, t("composer.remoteHint")),
          ),
          h(WeixinRemoteModelSelect, { sessionId: props.sessionId, t }),
          typeof props.useSession === "function"
            ? h(WeixinStopButton, { ctx: props.ctx, sessionId: props.sessionId, useSession: props.useSession, t })
            : null,
        ),
      );
    }

    const PANEL_ID = "weixin-channel";
    const EMBED_SLOT = "weixin-channel.conversation";

    function EmbeddedChatView({ renderSlot }) {
      return renderSlot("conversation.session", { view: "chat" });
    }

    function EmbeddedWeixinConversation({ sessionId, renderFactorySlot }) {
      if (sessionId === undefined) return null;
      if (typeof renderFactorySlot !== "function") return null;
      return renderFactorySlot("conversation.content", {
        variant: "embedded",
        phase: "active",
        hero: false,
      }, { slots: { views: EmbeddedChatView } });
    }

    /** 面板内嵌会话需要显式 retain；切换或卸载时释放引用。 */
    function useRetainedSession(sessions, sessionId) {
      const [state, setState] = useState({ sessionId: undefined, reference: null, ready: false });
      useEffect(() => {
        if (!sessions || typeof sessions.retain !== "function" || !sessionId) {
          setState({ sessionId, reference: null, ready: false });
          return undefined;
        }
        let cancelled = false;
        let reference;
        try {
          reference = sessions.retain(sessionId, { source: "weixin-channel" });
        } catch {
          setState({ sessionId, reference: null, ready: false });
          return undefined;
        }
        setState({ sessionId, reference, ready: false });
        Promise.resolve(reference.ready).then(() => {
          if (!cancelled) setState({ sessionId, reference, ready: true });
        }).catch(() => {
          if (!cancelled) setState({ sessionId, reference: null, ready: false });
        });
        return () => {
          cancelled = true;
          try { reference.release(); } catch { /* already released */ }
        };
      }, [sessions, sessionId]);
      if (state.sessionId !== sessionId) return { sessionId, reference: null, ready: false };
      return state;
    }

    /** 左侧边栏全局面板图标：双气泡表示微信。 */
    function PanelGlyph({ size = 20 }) {
      return h("svg", {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": "true",
        style: { display: "block" },
      },
        h("path", {
          d: "M2.6 8.5c0-2.8 2.7-5 6-5s6 2.2 6 5-2.7 5-6 5c-.7 0-1.4-.1-2-.2l-2.6 1.4c-.4.2-.9-.2-.7-.6l.5-2c-.8-.9-1.2-2.1-1.2-3.6Z",
          fill: "currentColor",
          opacity: 0.45,
        }),
        h("path", {
          d: "M9.2 12.1c0-2.6 2.6-4.7 5.8-4.7s5.8 2.1 5.8 4.7-2.6 4.7-5.8 4.7c-.8 0-1.5-.1-2.2-.3l-2.7 1.5c-.4.2-.9-.2-.7-.6l.6-1.9c-.5-.9-.8-2-.8-3.4Z",
          fill: "currentColor",
        }),
      );
    }

    function WeixinChannelPanel(props) {
      const t = props.t || fallbackT;
      const ctx = props.ctx;
      const [data, setData] = useState(null);
      const [catalog, setCatalog] = useState({ providers: [], permissions: [], agentPresets: [], agentPreset: "standard", assistant: null, cwd: "", permission: "" });
      const [error, setError] = useState("");
      const [loading, setLoading] = useState(true);
      const [adding, setAdding] = useState(false);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const refresh = useCallback(() => channelRefresh.invalidate().catch(() => undefined), []);
      useEffect(() => channelRefresh.subscribe((next, failure) => {
        if (failure) {
          setError(t("error.connection"));
          setLoading(false);
          return;
        }
        if (next && next.ok) {
          setData(next);
          setError("");
        } else if (next) {
          setError(serverText(next.error, t) || t("error.load"));
        }
        setLoading(false);
      }), []);
      useEffect(() => {
        api("/assistant").then((next) => {
          if (!next.ok) return;
          setCatalog({
            providers: next.providers || [],
            permissions: next.permissions || [],
            agentPresets: next.agentPresets || [],
            agentPreset: next.agentPreset || "standard",
            assistant: next.assistant || null,
            cwd: next.cwd || "",
            permission: next.permission || "",
          });
        }).catch(() => undefined);
      }, []);
      const useWorkspacesHook = typeof props.useWorkspaces === "function" ? props.useWorkspaces : null;
      const workspaces = useWorkspacesHook ? (useWorkspacesHook((state) => (state && state.items) || []) || []) : [];
      const createWorkspace = (input) => (ctx && ctx.workspaces && typeof ctx.workspaces.create === "function"
        ? ctx.workspaces.create(input)
        : Promise.reject(new Error("workspace unavailable")));
      const pickDirectory = () => pickHostDirectory(ctx);
      const channels = (data && data.channels) || [];
      const ch = channels.find((item) => item.id === "weixin") || {
        id: "weixin", label: "微信", description: "", kind: "qr", fields: [], accounts: [],
      };
      const accounts = Array.isArray(ch.accounts) ? ch.accounts : [];
      const account = accounts[0] || null;
      const groups = (data && data.groups) || [];
      const sessions = groups.flatMap((group) => (group && group.sessions) || [])
        .filter((session) => !account || String(session.channel || "") === account.id)
        .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
      const [selectedSessionId, setSelectedSessionId] = useState("");
      const activeSession = sessions.find((session) => String(session.sessionId) === selectedSessionId) || sessions[0] || null;
      const attached = useRetainedSession(ctx && ctx.sessions, activeSession ? activeSession.sessionId : undefined);
      const EmbedSessionProvider = props.SessionProvider;
      const renderSlot = props.renderSlot;
      const canEmbed = Boolean(activeSession) && attached.ready && typeof EmbedSessionProvider === "function" && typeof renderSlot === "function";
      const pending = ((data && data.pending) || []).filter((item) => !account || item.channelId === account.id);
      const openSession = (sessionId) => {
        if (!sessionId) return;
        const hostOpen = props.openSession || props.open;
        let opened = false;
        if (typeof hostOpen === "function") {
          hostOpen(sessionId);
          opened = true;
        } else {
          opened = openHostSession(ctx, sessionId);
        }
        // 宿主 sidebar shell 提供的全局打开入口作为兜底。
        if (!opened && typeof window !== "undefined" && typeof window.__dshSessionsOpen === "function") {
          try { window.__dshSessionsOpen(sessionId); opened = true; } catch { /* 旧宿主没有该入口 */ }
        }
        // 全局面板不会因为打开会话而自动退出：null 才是“回到会话”的官方选择。
        const layout = (ctx && ctx.layout) || probeService(ctx, "layout");
        if (layout && typeof layout.selectPanel === "function") {
          try { layout.selectPanel(null); } catch {
            try { layout.selectPanel("conversation"); } catch { /* 旧宿主没有该面板 */ }
          }
        }
      };
      const onAction = (id, action, body) => {
        setBusy(true);
        return api("/accounts/" + id + "/" + action, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body || {}),
        }).then((result) => {
          if (!result.ok) {
            setError(serverText(result.error, t) || t("error.action"));
            return false;
          }
          setError("");
          if (action === "remove") setSettingsOpen(false);
          refresh();
          return action === "check" ? result : true;
        }).catch(() => {
          setError(t("error.request"));
          return false;
        }).finally(() => setBusy(false));
      };
      const saveAccount = (id, body) => onAction(id, "settings", body);
      const approve = (item, allow) => onAction(item.channelId, allow ? "approve" : "deny", { userId: item.userId });
      const statusKey = account
        ? (account.receiveConfigured === false ? "connection.paused" : "connection." + (account.connectionState || "unknown"))
        : "";
      const statusTone = !account || account.receiveConfigured === false
        ? "idle"
        : account.connectionState === "connected"
          ? "success"
          : account.connectionState === "error"
            ? "error"
            : "warning";
      return h("section", { className: "dwc-panel", "aria-label": t("settings.label") },
        h("header", { className: "dwc-panel-head" },
          h("div", { className: "dwc-panel-head-copy" },
            h("h2", { className: "dwc-panel-title" },
              account
                ? [
                    h("span", { key: "name", className: "dwc-panel-title-name" }, accountLabel(account, t)),
                    h("span", { key: "status", className: "dwc-panel-title-status is-" + statusTone },
                      h("span", { className: "dwc-panel-status-dot", "aria-hidden": "true" }),
                      t(statusKey),
                    ),
                  ]
                : h("span", { className: "dwc-panel-title-plugin" }, t("settings.title")),
            ),
            h("p", { className: "dwc-panel-desc" }, t("settings.description")),
          ),
          account
            ? h("div", { className: "dwc-panel-actions" },
                h(Button, {
                  variant: "outline",
                  size: "sm",
                  icon: h(IconSettingsOutline16, { size: 14 }),
                  disabled: Boolean(busy),
                  onClick: () => setSettingsOpen(true),
                }, t("action.settings")),
              )
            : null,
        ),
        error && h("div", { className: "dwc-panel-body" }, h(NoticeBar, { type: "error", role: "alert" }, error)),
        loading && !data
          ? h("div", { className: "dwc-panel-body" }, h("div", { className: "dwc-channel-empty" }, t("loading")))
          : !account
            ? h("div", { className: "dwc-empty-hero" },
                h("div", { className: "dwc-empty-hero-icon" }, h(BrandMark, { id: "weixin", size: 42 })),
                h("h3", { className: "dwc-empty-hero-title" }, t("channel.emptyTitle")),
                h("p", { className: "dwc-empty-hero-desc" }, t("channel.empty")),
                h(Button, {
                  variant: "primary",
                  className: "dwc-empty-hero-add",
                  icon: h(IconPlusOutline, { size: 15 }),
                  disabled: !data || busy,
                  onClick: () => setAdding(true),
                }, t("action.addAccount")),
              )
            : h("div", { className: "dwc-panel-body" },
                pending.length > 0 && h("div", { className: "dwc-channel-pending", role: "region" },
                  h("div", { className: "dwc-channel-pending-title" }, t("pending.notice")),
                  ...pending.map((item) => h("div", { key: item.channelId + item.userId, className: "dwc-channel-pending-row" },
                    h("span", { className: "dwc-channel-pending-user" }, item.username || item.userId),
                    h(Button, { size: "sm", variant: "primary", onClick: () => approve(item, true) }, t("action.approve")),
                    h(Button, { size: "sm", variant: "outline", danger: true, onClick: () => approve(item, false) }, t("action.deny")),
                  )),
                ),
                canEmbed
                  ? h("div", { className: "dwc-embed" },
                      h("div", { className: "dwc-embed-head" },
                        h("span", { className: "dwc-embed-title" }, activeSession.title || t("session.untitled")),
                        h("span", { className: "dwc-embed-time" }, relativeTime(activeSession.updatedAt, t)),
                        sessions.length > 1
                          ? h(Select, {
                              className: "dwc-embed-session-select",
                              value: String(activeSession.sessionId),
                              "aria-label": t("channel.sessions"),
                              options: sessions.map((session) => ({ value: String(session.sessionId), label: session.title || t("session.untitled") })),
                              onChange: (next) => setSelectedSessionId(next),
                            })
                          : null,
                      ),
                      h(EmbedSessionProvider, { session: attached.reference },
                        h("div", { className: "dwc-embed-body" },
                          renderSlot(EMBED_SLOT, {}))),
                    )
                  : sessions.length > 0
                    ? h("div", { className: "dwc-channel-account" },
                        h("div", { className: "dwc-panel-section-title" }, t("channel.sessions")),
                        h("div", { className: "dwc-panel-sessions" },
                          ...sessions.map((session) => h("button", {
                            key: session.sessionId,
                            type: "button",
                            className: "dwc-channel-session",
                            title: session.title || t("session.untitled"),
                            onClick: () => openSession(session.sessionId),
                          },
                            h("span", { className: "dwc-channel-session-title" }, session.title || t("session.untitled")),
                            h("span", { className: "dwc-channel-session-time" }, relativeTime(session.updatedAt, t)),
                          )),
                        ),
                      )
                    : h("div", { className: "dwc-channel-account" },
                        h("div", { className: "dwc-panel-section-title" }, t("channel.sessions")),
                        h("div", { className: "dwc-channel-account-empty" }, t("account.noSessions")),
                      ),
              ),
        adding && h(BindModal, {
          ch,
          catalog: catalog.providers,
          permissions: catalog.permissions,
          agentPresets: catalog.agentPresets,
          workspaces,
          createWorkspace,
          pickDirectory,
          modelT: props.modelT,
          permissionT: props.permissionT,
          presetT: props.presetT,
          defaults: catalog,
          readMainSessionModel: props.readMainSessionModel,
          onClose: () => setAdding(false),
          onConnected: () => { setAdding(false); refresh(); },
          t,
        }),
        account && settingsOpen && h(Modal, {
          open: true,
          className: "dwc-account-modal",
          title: t("action.settings"),
          width: 760,
          zIndex: 1100,
          layerOwner: "weixin-account",
          destroyOnHidden: true,
          onCancel: () => setSettingsOpen(false),
          footer: null,
        }, h(AccountInspector, {
          account,
          busy: Boolean(busy),
          catalog: catalog.providers,
          permissions: catalog.permissions,
          agentPresets: catalog.agentPresets,
          workspaces,
          createWorkspace,
          pickDirectory,
          modelT: props.modelT,
          permissionT: props.permissionT,
          presetT: props.presetT,
          t,
          onAction,
          onSave: saveAccount,
        })),
      );
    }

    function apply(ctx) {
      ensureStyle();
      ctx.effect(() => ctx.locale.register(DWC_LOCALE_NS, DWC_LOCALES), "weixin-channel: dictionaries");
      const t = ctx.locale.bind(DWC_LOCALE_NS);
      const permissionT = ctx.locale.bind("permission.access");
      const modelT = ctx.locale.bind("model");
      const presetT = ctx.locale.bind("settings.agentPreset");
      const subscribeLocale = (listener) => ctx.locale.subscribe(listener);
      const localeSnapshot = () => ctx.locale.getSnapshot();
      function LocalizedPanel(props) {
        useSyncExternalStore(subscribeLocale, localeSnapshot, localeSnapshot);
        return h(WeixinChannelPanel, Object.assign({}, props, {
          ctx,
          t,
          permissionT,
          modelT,
          presetT,
          readMainSessionModel: () => readMainSessionModel(ctx),
        }));
      }
      function LocalizedComposerGuard(props) {
        useSyncExternalStore(subscribeLocale, localeSnapshot, localeSnapshot);
        return h(WeixinComposerGuard, Object.assign({}, props, { t, ctx }));
      }

      // 频道会话归属依赖宿主 session 列表；插件激活后持续刷新，避免打开会话时 composer 尚未接管。
      ctx.effect(() => {
        let pending = channelSessionIds.size > 0, flight = null, disposed = false;
        const refresh = (changed) => {
          pending = pending || changed;
          if (disposed || !pending || flight) return;
          const sessions = probeService(ctx, "sessions");
          if (!sessions || typeof sessions.refresh !== "function") return;
          const revision = channelMembershipRevision;
          flight = Promise.resolve().then(() => {
            if (disposed) return;
            return sessions.refresh();
          }).then(() => {
            if (disposed) return;
            const snapshot = sessions.list && typeof sessions.list.getSnapshot === "function" ? sessions.list.getSnapshot() : undefined;
            if (snapshot && snapshot.state === "error") return;
            if (revision === channelMembershipRevision) pending = false;
          }).catch(() => { /* 保留待处理状态，由下次渠道刷新重试 */ })
            .finally(() => { flight = null; });
        };
        requestHostSessionRefresh = refresh;
        return () => {
          disposed = true;
          if (requestHostSessionRefresh === refresh) requestHostSessionRefresh = () => {};
        };
      }, "weixin-channel: host session refresh");
      ctx.effect(() => channelRefresh.subscribe((data, error) => {
        if (error) console.warn("[dsh-weixin-channel] 无法刷新频道会话归属", error);
      }), "weixin-channel: channel membership");

      // 1) 左侧边栏菜单项，与官方客户端类菜单项平级。
      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 30,
        label: () => t("settings.label"),
      }, PanelGlyph));

      // 2) 主界面：空状态显示“添加微信频道”，存在频道后右上角显示“设置”。
      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        children: {
          [EMBED_SLOT]: { kind: "single", scope: "session" },
        },
      }, LocalizedPanel));
      ctx.slots.inject(EMBED_SLOT, () => ctx.slots.register({
        name: EMBED_SLOT,
      }, EmbeddedWeixinConversation));

      // 3) 微信会话行前显示微信品牌标。
      ctx.slots.inject("sidebar.session.row.leading", () => ctx.slots.register({
        name: "sidebar.session.row.leading",
        id: "weixin-channel-session-channel",
        order: 10,
      }, function ChannelSessionLeading({ sessionId }) {
        useSyncExternalStore(subscribeChannelMembership, channelMembershipSnapshot, channelMembershipSnapshot);
        if (!isChannelSession(sessionId)) return null;
        return h("span", { className: "dwc-session-channel-icon", "aria-hidden": "true" }, h(Logo, { id: "weixin", small: true }));
      }));

      // 微信会话只能通过微信继续；替换宿主 composer，避免本地输入被丢弃。
      ctx.slots.inject("conversation.composer", () => ctx.slots.register({
        name: "conversation.composer",
        select: (owner) => {
          if (!owner || !isChannelSession(owner.sessionId)) return null;
          if (owner.pendingInteraction) return null;
          return true;
        },
      }, LocalizedComposerGuard));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
