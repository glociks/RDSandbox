import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Link2, CornerDownRight, RotateCcw } from 'lucide-react';
import { AutoMarqueeText } from './AutoMarqueeText';

export const Card = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`ui-card ${className}`} {...props}>
    {children}
  </div>
);

export const CollapsibleSection = ({
  id, title, icon: Icon, children, defaultOpen = true, isOpen: controlledOpen, onOpenChange, className = "", headerClassName = "", indicator
}: {
  id?: string;
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  headerClassName?: string;
  indicator?: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const sectionContentId = id ? `${id}-content` : undefined;

  return (
    <div id={id} className={`ui-section ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={sectionContentId}
        className={`w-full flex items-center justify-between ui-section-header group ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="ui-section-icon ui-icon-sidebar ui-icon-section" />}
          <span className="font-medium uppercase tracking-wider ui-section-title">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {indicator}
          {isOpen ? <ChevronDown size={12} className="ui-section-chevron ui-icon-section text-zinc-600 transition-transform duration-200" /> : <ChevronRight size={12} className="ui-section-chevron ui-icon-section text-zinc-600 transition-transform duration-200" />}
        </div>
      </button>
      <div
        id={sectionContentId}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}
      >
        <div className={isOpen ? 'overflow-visible' : 'overflow-hidden'}>
          <div className="ui-section-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const ToggleableSection = ({
  id, label, icon: Icon, children, defaultOpen = false, className = "",
  isEnabled, onToggle, isLinking, onLink, linkStatus, iconColorClass, automatedValue,
  isOpen: controlledOpen, onOpenChange
}: {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  isEnabled: boolean;
  onToggle: (v: boolean) => void;
  isLinking?: boolean;
  onLink?: () => void;
  linkStatus?: string;
  iconColorClass?: string;
  automatedValue?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const isAutomated = automatedValue !== undefined;
  const isSectionActive = isEnabled || isAutomated;

  const toggleOpen = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div id={id} className={`ui-section ${isSectionActive ? 'is-enabled' : 'is-disabled'} ${className}`}>
      <div className="flex items-center justify-between ui-section-header group">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer select-none"
          onClick={toggleOpen}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(); } }}
        >
          {Icon && <Icon size={12} className={`ui-section-icon ui-icon-section ${isSectionActive ? (iconColorClass || "ui-icon-active") : ""} transition-colors`} />}
          <span className="font-medium uppercase tracking-wider ui-section-title">
            {label}
            {isAutomated && <span className="ml-1 text-yellow-500 text-[8px]">(AUTO)</span>}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLinking && onLink && (
            <Button
              size="xs"
              variant={linkStatus === 'selected' ? 'outline' : 'secondary'}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onLink(); }}
              className={linkStatus === 'selected' ? 'border-emerald-500 text-emerald-300' : ''}
              aria-label={`Link ${label}`}
            >
              {linkStatus === 'selected' ? 'LINKED' : 'LINK'}
            </Button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={isEnabled} onCheckedChange={onToggle} automatedValue={automatedValue} aria-label={`Enable ${label}`} />
          </div>
          <button
            type="button"
            onClick={toggleOpen}
            aria-expanded={isOpen}
            aria-label={`Toggle ${label} section`}
            className="text-zinc-600 hover:text-zinc-300 outline-none"
          >
            {isOpen ? <ChevronDown size={12} className="ui-section-chevron ui-icon-section" /> : <ChevronRight size={12} className="ui-section-chevron ui-icon-section" />}
          </button>
        </div>
      </div>
      {isOpen && <div className="ui-section-content">{children}</div>}
    </div>
  );
};

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  as?: 'label' | 'span' | 'div';
}

export const Label = ({ children, className = "", htmlFor, as, ...props }: LabelProps) => {
  const Component = as || (htmlFor ? 'label' : 'span');
  return (
    <Component
      {...(htmlFor ? { htmlFor } : {})}
      className={`ui-label ${className}`}
      {...(props as any)}
    >
      {children}
    </Component>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'icon' | 'iconSm';
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  className = "",
  size = "md",
  title = "",
  disabled = false,
  type = "button",
  ...props
}) => {
  const base = "inline-flex items-center justify-center ui-btn disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "ui-btn-primary shadow-sm",
    secondary: "ui-btn-secondary",
    ghost: "ui-btn-ghost",
    outline: "ui-btn-outline",
    destructive: "ui-btn-destructive"
  };
  const sizes: Record<string, string> = {
    xs: "min-h-[1.25rem]",
    sm: "min-h-[1.5rem]",
    md: "min-h-[2rem]",
    icon: "h-7 w-7 sm:h-8 sm:w-8 !p-0",
    iconSm: "h-5 w-5 sm:h-6 sm:w-6 !p-0"
  };
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const formatParameterValue = (val: number, step?: number): string => {
  if (typeof val !== 'number' || isNaN(val)) return '0.00';
  if (val === 0) return '0.00';

  const absVal = Math.abs(val);

  let stepDecimals = 2;
  if (step && step > 0 && step < 1) {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      stepDecimals = Math.max(stepDecimals, stepStr.split('.')[1].length);
    }
  }

  if (absVal < 0.0001) {
    return val.toExponential(2);
  }

  if (absVal < 0.01) {
    return val.toFixed(Math.max(4, stepDecimals));
  }

  if (absVal < 0.1) {
    return val.toFixed(Math.max(3, stepDecimals));
  }

  if (absVal >= 1000) {
    return val.toFixed(0);
  }

  if (absVal >= 100) {
    return val.toFixed(1);
  }

  return val.toFixed(stepDecimals);
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: number | string } }) => void;
}

export const Input: React.FC<InputProps> = ({ className = "", value, onChange, disabled, id, name, ...props }) => {
  const defaultId = React.useId();
  const inputId = id || (name ? `${name}-input` : defaultId);
  const inputName = name || id || inputId;
  const [localVal, setLocalVal] = useState<string>(value !== undefined && value !== null ? value.toString() : '');

  useEffect(() => {
    setLocalVal(value !== undefined && value !== null ? value.toString() : '');
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (props.type === 'number') {
      const parsed = parseFloat(localVal);
      if (!isNaN(parsed)) {
        onChange?.({ target: { value: parsed } });
      } else {
        onChange?.({ target: { value: localVal } });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseFloat(localVal);
      if (!isNaN(parsed)) {
        onChange?.({ target: { value: parsed } });
      } else {
        onChange?.({ target: { value: localVal } });
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
    if (props.type !== 'number' && !disabled && onChange) {
      onChange(e);
    }
  };

  return (
    <input
      id={inputId}
      name={inputName}
      aria-label={props['aria-label'] || inputName}
      className={`flex w-full ui-input shadow-sm font-mono disabled:opacity-80 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      {...props}
    />
  );
};

export interface SliderProps {
  value: number | number[];
  min: number;
  max: number;
  step?: number;
  onChange?: (val: number) => void;
  onValueChange?: (val: number[]) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value, min, max, step, onChange, onValueChange, className = "", disabled = false, id, name, 'aria-label': ariaLabel
}) => {
  const defaultId = React.useId();
  const inputId = id || (name ? `${name}-slider` : defaultId);
  const inputName = name || id || inputId;
  const numVal = Array.isArray(value) ? value[0] : value;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange?.(val);
      onValueChange?.([val]);
    }
  };
  return (
    <input
      type="range"
      role="slider"
      aria-label={ariaLabel || name || id || 'Slider'}
      aria-valuenow={numVal ?? 0}
      aria-valuemin={min}
      aria-valuemax={max}
      id={inputId}
      name={inputName}
      min={min}
      max={max}
      step={step}
      value={numVal ?? 0}
      disabled={disabled}
      onChange={handleChange}
      className={`ui-slider appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
};

export interface VerticalSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  value, min, max, step = 0.01, onChange, className = "", 'aria-label': ariaLabel = "Vertical Slider", id, name
}) => {
  const defaultId = React.useId();
  const inputId = id || (name ? `${name}-vslider` : defaultId);
  const inputName = name || id || inputId;
  return (
    <div className={`relative flex flex-col items-center h-28 sm:h-36 w-6 ${className}`}>
      <input
        type="range"
        role="slider"
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        id={inputId}
        name={inputName}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute h-full w-2 appearance-none ui-slider ui-slider-vertical cursor-pointer outline-none"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl'
        }}
      />
    </div>
  );
};

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  automatedValue?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked, onCheckedChange, automatedValue, className = "", 'aria-label': ariaLabel
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel || "Toggle switch"}
    onClick={(e) => { e.stopPropagation(); if (automatedValue === undefined) onCheckedChange(!checked); }}
    disabled={automatedValue !== undefined}
    className={`
      inline-flex shrink-0 cursor-pointer items-center ui-switch border-1 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed
      ${automatedValue !== undefined ? (automatedValue ? 'bg-yellow-500/50' : 'ui-switch-off border-yellow-500/50 border') : (checked ? 'ui-switch-on' : 'ui-switch-off')}
      ${className}
    `}
  >
    <span
      className={`
        pointer-events-none block ui-switch-thumb shadow-lg ring-0 transition-transform
        ${(automatedValue !== undefined ? automatedValue : checked) ? 'translate-x-3' : 'translate-x-0.5'}
        ${automatedValue !== undefined ? 'bg-yellow-100' : ''}
      `}
    />
  </button>
);

export interface ParameterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  highlight?: boolean;
  linkStatus?: 'idle' | 'selectable' | 'selected' | 'used';
  onLink?: () => void;
  automatedValue?: number;
  defaultValue?: number;
  disabled?: boolean;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  label, value, min, max, step, onChange,
  highlight = false, linkStatus = 'idle', onLink,
  automatedValue, defaultValue, disabled = false
}) => {
  const [showReset, setShowReset] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const isLinking = linkStatus && linkStatus !== 'idle';
  const isAutomated = automatedValue !== undefined;

  let borderClass = highlight ? 'border-indigo-500/20' : 'border-transparent';
  let bgClass = highlight ? 'bg-indigo-500/10' : '';
  let labelColor = highlight ? 'text-indigo-300' : 'ui-param-label';

  if (disabled) {
    bgClass = 'opacity-50 pointer-events-none grayscale';
  } else if (isLinking) {
    if (linkStatus === 'selectable') {
      borderClass = 'border-emerald-500/80 ring-1 ring-emerald-500/40';
      bgClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer shadow-md shadow-emerald-950/40';
      labelColor = 'text-emerald-300 font-bold';
    } else if (linkStatus === 'selected') {
      borderClass = 'border-emerald-400 ring-2 ring-emerald-400';
      bgClass = 'bg-emerald-500/35 cursor-pointer shadow-md shadow-emerald-950/60';
      labelColor = 'text-emerald-200 font-extrabold';
    } else if (linkStatus === 'used') {
      borderClass = 'border-red-500/50';
      bgClass = 'bg-red-500/10 cursor-not-allowed';
      labelColor = 'text-red-400';
    }
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isLinking && onLink && linkStatus !== 'used') {
      e.preventDefault();
      e.stopPropagation();
      onLink();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (defaultValue !== undefined && !isAutomated && !isLinking) {
      e.preventDefault();
      e.stopPropagation();
      setMenuPos({ x: e.clientX, y: e.clientY });
      setShowReset(true);
    }
  };

  const displayValue = isAutomated ? automatedValue : value;
  const baseId = React.useId();
  const inputId = `${baseId}-input`;
  const sliderId = `${baseId}-slider`;

  return (
    <div
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
      className={`relative ui-param-control transition-colors duration-150 border ${borderClass} ${bgClass}`}
    >
      {showReset && createPortal(
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto"
          onMouseDown={() => setShowReset(false)}
          onContextMenu={(e) => { e.preventDefault(); setShowReset(false); }}
        >
          <div
            className="absolute ui-ctx-menu shadow-xl p-1 z-[10000]"
            style={{ top: menuPos.y, left: menuPos.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(defaultValue!); setShowReset(false); }}
              className="flex items-center gap-2 text-[10px] ui-ctx-menu-item px-2 py-1.5 whitespace-nowrap transition-colors"
            >
              <RotateCcw size={12} className="text-zinc-500" />
              <span>Reset to <span className="font-mono text-zinc-400">{defaultValue}</span></span>
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="flex justify-between items-center ui-param-header pointer-events-none-if-linking gap-1">
        <label
          htmlFor={inputId}
          className={`flex items-center gap-1 ui-param-title truncate flex-1 min-w-0 pr-1 whitespace-nowrap cursor-pointer ${labelColor}`}
        >
          {isAutomated && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" title="Automated" />}
          <AutoMarqueeText text={label} className="truncate min-w-0 flex-1" />
          {linkStatus === 'selected' && <Link2 size={10} className="flex-shrink-0" />}
          {linkStatus === 'selectable' && <CornerDownRight size={10} className="opacity-50 flex-shrink-0" />}
        </label>
        <Input
          id={inputId}
          name={inputId}
          type="number"
          aria-label={label}
          value={typeof displayValue === 'number' ? formatParameterValue(displayValue, step) : displayValue}
          onChange={(e: { target: { value: string | number } }) => {
            if (!isLinking && !isAutomated && !disabled) {
              const val = typeof e.target?.value === 'number' ? e.target.value : parseFloat(e.target.value as string);
              if (!isNaN(val)) onChange(val);
            }
          }}
          disabled={isAutomated || disabled}
          className={`ui-param-input text-right shrink-0 ${isLinking ? 'pointer-events-none opacity-50' : ''} ${isAutomated ? 'text-yellow-400 border-yellow-500/30 font-bold' : ''}`}
          step={step && step < 0.01 ? step : 'any'}
        />
      </div>
      <div className={`ui-param-slider-wrapper ${isLinking ? 'pointer-events-none opacity-50' : ''}`}>
        <Slider
          id={sliderId}
          name={sliderId}
          min={min}
          max={max}
          step={step}
          value={displayValue ?? 0}
          onChange={onChange}
          aria-label={label}
          disabled={isAutomated || disabled}
          className={`${highlight ? "accent-indigo-400" : ""} ${isAutomated ? "accent-yellow-400 opacity-80" : ""}`}
        />
      </div>
    </div>
  );
};

export interface ToggleLinkControlProps {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
  automatedValue?: boolean;
  onLink?: () => void;
  linkStatus?: 'idle' | 'selectable' | 'selected' | 'used';
  iconColorClass?: string;
}

export const ToggleLinkControl: React.FC<ToggleLinkControlProps> = ({
  label, icon: Icon, checked, onChange, automatedValue, onLink, linkStatus, iconColorClass
}) => {
  const isLinking = linkStatus && linkStatus !== 'idle';
  const isAutomated = automatedValue !== undefined;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className={checked || isAutomated ? iconColorClass : ""} />}
        <Label className="cursor-pointer" onClick={() => !isAutomated && onChange(!checked)}>
          {label}
          {isAutomated && <span className="ml-1 text-yellow-500 text-[8px]">(AUTO)</span>}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          automatedValue={automatedValue}
          aria-label={`Toggle ${label}`}
        />
        {onLink && linkStatus !== 'idle' && (
          <Button
            size="xs"
            variant={linkStatus === 'selected' ? 'outline' : 'secondary'}
            onClick={onLink}
            className={linkStatus === 'selected' ? 'border-emerald-500 text-emerald-300' : ''}
            aria-label={`Link ${label}`}
          >
            {linkStatus === 'selected' ? 'LINKED' : 'LINK'}
          </Button>
        )}
      </div>
    </div>
  );
};
