import React, { useState, useEffect } from "react";
import { Button, Card, Steps, Input, message, Spin, Select } from "antd";
import { getMessage } from "./Sidebar/lang";
import "../styles/custom_antd.css";
import "../styles/initialization.css";

interface InitializationPageProps {
  onInitializationComplete: () => void;
}

const languageOptions = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

const InitializationPage: React.FC<InitializationPageProps> = ({
  onInitializationComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [projectType, setProjectType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "zh">("zh");

  // Fetch project type on step 2
  useEffect(() => {
    if (currentStep === 1) {
      fetchProjectType();
    }
  }, [currentStep]);

  // Optionally: load last selected language from localStorage or API
  useEffect(() => {
    // Try to use localStorage or system/browser language
    const lang = localStorage.getItem("auto-coder-language") as
      | "en"
      | "zh"
      | null;
    if (lang === "en" || lang === "zh") {
      setCurrentLanguage(lang);
    } else {
      // fallback: try navigator.language
      if (navigator.language.startsWith("zh")) {
        setCurrentLanguage("zh");
      } else {
        setCurrentLanguage("en");
      }
    }
  }, []);

  // Persist language selection
  const handleLanguageChange = (value: "en" | "zh") => {
    setCurrentLanguage(value);
    localStorage.setItem("auto-coder-language", value);
  };

  const fetchProjectType = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/guess/project_type");
      const data = await response.json();
      setProjectType(data.project_type || "");
    } catch (error) {
      console.error("Error fetching project type:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeProject = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch("/api/initialization-project", {
        method: "POST",
      });

      const tip = document.querySelector("#not_initialized_warning");
      console.log("#not_initialized_warning:", tip);
      if (tip) {
        document.removeChild(tip);
      }

      if (response.ok) {
        setCurrentStep(1);
      } else {
        message.error(
          getMessage("failedToInitialize", {}, currentLanguage) ||
            "Failed to initialize project"
        );
      }
    } catch (error) {
      console.error("Error initializing project:", error);
      message.error(
        getMessage("failedToInitialize", {}, currentLanguage) ||
          "Failed to initialize project"
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const configureProjectType = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/congigure/project_type?project_type=${encodeURIComponent(
          projectType
        )}`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        message.success(
          getMessage("projectConfigurationComplete", {}, currentLanguage) ||
            "Project configuration complete"
        );
        onInitializationComplete();
      } else {
        message.error(
          getMessage("failedToConfigureProjectType", {}, currentLanguage) ||
            "Failed to configure project type"
        );
      }
    } catch (error) {
      console.error("Error configuring project type:", error);
      message.error(
        getMessage("failedToConfigureProjectType", {}, currentLanguage) ||
          "Failed to configure project type"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      title:
        getMessage("initializeProject", {}, currentLanguage) ||
        "Initialize Project",
      content: (
        <div className="text-center p-6">
          <h2 className="initialization-title">
            {getMessage("projectNeedsInitialization", {}, currentLanguage) ||
              "This project needs to be initialized"}
          </h2>
          <p className="initialization-description">
            {getMessage("initializationExplanation", {}, currentLanguage) ||
              "Initialize the project to set up necessary files and configurations"}
          </p>
          <Button
            type="primary"
            size="large"
            onClick={initializeProject}
            loading={isInitializing}
            className="dark-button"
          >
            {getMessage("initializeNow", {}, currentLanguage) ||
              "Initialize Now"}
          </Button>
        </div>
      ),
    },
    {
      title:
        getMessage("configureProjectType", {}, currentLanguage) ||
        "Configure Project Type",
      content: (
        <div className="text-center p-6">
          <h2 className="initialization-title">
            {getMessage("configureProjectTypeTitle", {}, currentLanguage) ||
              "Configure Project Type"}
          </h2>
          <p className="initialization-description">
            {getMessage("projectTypeExplanation", {}, currentLanguage) ||
              "Project type defines file extensions AI should focus on"}
          </p>

          {isLoading ? (
            <Spin />
          ) : (
            <>
              <Input
                className="dark-input mb-4 max-w-md mx-auto"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder={
                  getMessage("projectTypePlaceholder", {}, currentLanguage) ||
                  "e.g. js,ts,jsx,tsx"
                }
              />
              <Button
                type="primary"
                size="large"
                onClick={configureProjectType}
                loading={isLoading}
                className="dark-button"
              >
                {getMessage("saveConfiguration", {}, currentLanguage) ||
                  "Save Configuration"}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="initialization-page flex items-center justify-center p-4">
      <Card className="initialization-card" bordered={false}>
        {/* Language Switcher */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <Select
            value={currentLanguage}
            style={{ width: 120 }}
            onChange={handleLanguageChange}
            options={languageOptions}
            size="small"
          />
        </div>
        <Steps
          current={currentStep}
          items={steps.map((item) => ({ title: item.title }))}
          className="mb-8"
        />
        <div className="p-4 rounded">{steps[currentStep].content}</div>
      </Card>
    </div>
  );
};

export default InitializationPage;
