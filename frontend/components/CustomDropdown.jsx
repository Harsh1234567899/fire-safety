import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom styled dropdown to replace native <select> elements.
 *
 * Props:
 *  - value: current selected value
 *  - onChange: (value) => void
 *  - options: [{ value, label }] or ['string', ...]
 *  - placeholder: placeholder text
 *  - icon: optional Lucide icon component to show on the left
 *  - className: optional extra classes for the trigger button
 *  - disabled: boolean
 */
const CustomDropdown = ({ value, onChange, options = [], placeholder = 'Select...', icon: Icon, className = '', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Normalize options to { value, label }
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = normalizedOptions.find(o => o.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleSelect = (optValue) => {
        onChange(optValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all outline-none cursor-pointer w-full text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'border-gray-300 shadow-sm ring-2 ring-gray-100' : ''} ${className}`}
            >
                {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
                <span className={`flex-1 truncate ${!selectedOption ? 'text-gray-400' : ''}`}>
                    {displayText}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1.5 w-full min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[240px] overflow-y-auto py-1">
                        {normalizedOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${opt.value === value
                                        ? 'bg-gray-900 text-white font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50 font-medium'
                                    }`}
                            >
                                <span className="flex-1 truncate">{opt.label}</span>
                                {opt.value === value && (
                                    <Check size={14} className="flex-shrink-0" />
                                )}
                            </button>
                        ))}
                        {normalizedOptions.length === 0 && (
                            <div className="px-3 py-4 text-xs text-gray-400 text-center">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
