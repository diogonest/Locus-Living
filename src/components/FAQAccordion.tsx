import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-[840px] divide-y divide-stone-200/40 border-t border-b border-stone-200/40">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className="py-2">
            <button
              onClick={() => toggleIndex(index)}
              className="w-full text-left flex items-center justify-between gap-6 py-5 px-1 font-display text-lg sm:text-xl text-stone-800 hover:text-stone-900 transition-colors focus:outline-none"
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <span className="relative w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {/* Horizontal line */}
                <span className="absolute w-4 h-[2px] bg-stone-600 rounded" />
                {/* Vertical line with rotation when open */}
                <span 
                  className={`absolute w-[2px] h-4 bg-stone-600 rounded transition-transform duration-300 ease-out ${
                    isOpen ? 'rotate-90 scale-y-0 opacity-0' : 'rotate-0 scale-y-100 opacity-100'
                  }`}
                />
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-out`}
              style={{
                maxHeight: isOpen ? '250px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="pb-6 px-1 text-stone-600 font-light leading-relaxed max-w-[64ch] text-[15px] sm:text-[16px]">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
