"use client";

import { useState } from "react";

interface TabNavigationProps {
  tabs: { id: string; label: string }[];
  defaultTab?: string;
  children: React.ReactNode[];
}

export default function TabNavigation({
  tabs,
  defaultTab,
  children,
}: TabNavigationProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <>
      <div className="tab-navigation" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tab-content ${activeTab === tab.id ? "active" : ""}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          id={`tabpanel-${tab.id}`}
        >
          {children[index]}
        </div>
      ))}
    </>
  );
}
