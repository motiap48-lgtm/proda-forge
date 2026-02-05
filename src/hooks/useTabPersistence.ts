 import { useState, useEffect, useCallback } from "react";
 import { useSearchParams } from "react-router-dom";
 
 /**
  * Hook for persisting tab state in URL query params
  * @param defaultTab - Default tab value when none is specified
  * @param paramName - URL parameter name (default: "tab")
  * @returns [activeTab, setActiveTab] - Current tab and setter function
  */
 export const useTabPersistence = (
   defaultTab: string,
   paramName: string = "tab"
 ): [string, (value: string) => void] => {
   const [searchParams, setSearchParams] = useSearchParams();
   
   // Get initial tab from URL or use default
   const getInitialTab = useCallback(() => {
     return searchParams.get(paramName) || defaultTab;
   }, [searchParams, paramName, defaultTab]);
 
   const [activeTab, setActiveTabState] = useState(getInitialTab);
 
   // Sync state with URL on mount and URL changes
   useEffect(() => {
     const tabFromUrl = searchParams.get(paramName);
     if (tabFromUrl && tabFromUrl !== activeTab) {
       setActiveTabState(tabFromUrl);
     }
   }, [searchParams, paramName, activeTab]);
 
   // Update both state and URL
   const setActiveTab = useCallback(
     (value: string) => {
       setActiveTabState(value);
       setSearchParams(
         (prev) => {
           const newParams = new URLSearchParams(prev);
           if (value === defaultTab) {
             // Remove param if it's the default to keep URL clean
             newParams.delete(paramName);
           } else {
             newParams.set(paramName, value);
           }
           return newParams;
         },
         { replace: true }
       );
     },
     [setSearchParams, paramName, defaultTab]
   );
 
   return [activeTab, setActiveTab];
 };