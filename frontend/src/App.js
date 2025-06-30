import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { QAHeader } from "./QAHeader";
import Chat from "./Chat";
import { useState, useEffect } from "react";
import { TextField, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import * as React from "react";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Switch from "@mui/material/Switch";
import LoadingSpinner from "./Spinner";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";
import UrlSourcesForm from "./WebUrlsForm";
import {modelList} from "./RAGModels";
import Popover from "@mui/material/Popover";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from "@mui/icons-material/Settings";
import ChatIcon from "@mui/icons-material/Chat";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FlashOnIcon from "@mui/icons-material/FlashOn";

const App = (props) => {
  const [history, setHistory] = useState([]);
  const [selectedModel, setSelectedModel] = useState(undefined);
  const [baseUrl, setBaseUrl] = useState(undefined);
  const [question, setQuestion] = useState('');
  const [spinner, setSpinner] = useState(false);
  const [sessionId, setSessionId] = useState(undefined);
  const [sourceUrlInfo, setSourceUrlInfo] = useState({
    exclusionFilters: [],
    inclusionFilters: [],
    seedUrlList: [],
  });
  const [hasWebDataSource, setHasWebDataSource] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [devSettingsAnchor, setDevSettingsAnchor] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [sourcePanel, setSourcePanel] = useState({ isOpen: false, content: null, title: null });
  const [enableSourcePanel, setEnableSourcePanel] = useState(true);
  const [showHeaderImage, setShowHeaderImage] = useState(false);
  const [showQuickConfigSnackbar, setShowQuickConfigSnackbar] = useState(false);

  useEffect(() => {
    if (!baseUrl) {
      return;
    }
    const getWebSourceConfiguration = async () => {
      fetch(baseUrl + "urls", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setSourceUrlInfo({
            exclusionFilters: data.exclusionFilters ?? [],
            inclusionFilters: data.inclusionFilters ?? [],
            seedUrlList: data.seedUrlList ?? [],
          });
          setHasWebDataSource(true);
        })
        .catch((err) => {
          console.log("err", err);
        });

    };
    getWebSourceConfiguration();
  }, [baseUrl]);


  const handleSendQuestion = () => {
    if (!question.trim()) return;
    
    setSpinner(true);
    const currentQuestion = question;
    setQuestion(''); // Clear input immediately

    // Add the user question and a loading response immediately
    const newHistory = [
      ...history,
      {
        question: currentQuestion,
        response: "",
        isLoading: true,
        citation: undefined,
      },
    ];
    setHistory(newHistory);

    fetch(baseUrl + "docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestSessionId: sessionId,
        question: currentQuestion,
        modelId: selectedModel?.modelId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data", data);
        setSpinner(false);
        setSessionId(data.sessionId);
        // Update the last message with the actual response
        setHistory(prevHistory => {
          const updatedHistory = [...prevHistory];
          updatedHistory[updatedHistory.length - 1] = {
            question: currentQuestion,
            response: data.response,
            citation: data.citation,
            isLoading: false,
          };
          return updatedHistory;
        });
      })
      .catch((err) => {
        setSpinner(false);
        // Update the last message with error response
        setHistory(prevHistory => {
          const updatedHistory = [...prevHistory];
          updatedHistory[updatedHistory.length - 1] = {
            question: currentQuestion,
            response:
              "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
            citation: undefined,
            isLoading: false,
          };
          return updatedHistory;
        });
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  const handleNewChatClick = (event) => {
    // Show popover immediately on single click
    setPopoverAnchor(event.currentTarget);
  };

  const handleNewChatDoubleClick = (event) => {
    // Double-click: immediately start new chat and close any open popover
    event.preventDefault();
    setHistory([]);
    setShowSnackbar(true);
    setPopoverAnchor(null);
  };

  const handleConfirmNewChat = () => {
    setHistory([]);
    setPopoverAnchor(null);
  };

  const handleCancelNewChat = () => {
    setPopoverAnchor(null);
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const handleCloseQuickConfigSnackbar = () => {
    setShowQuickConfigSnackbar(false);
  };

  const handleUpdateUrls = async (
    urls,
    newExclusionFilters,
    newInclusionFilters
  ) => {
    try {
      const response = await fetch(baseUrl + "web-urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urlList: [...new Set(urls)],
          exclusionFilters: [...new Set(newExclusionFilters)],
          inclusionFilters: [...new Set(newInclusionFilters)],
        }),
      });
      return !!response.ok;
    } catch (error) {
      console.log("Error:", error);
      return false;
    }
  };

  const handleChangeModel = (model) => {
    setSelectedModel(model);
    setSessionId(undefined)
  }

  const handleOpenSourcePanel = (citation) => {
    // Extract URL from citation if it contains one
    const urlMatch = citation.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : null;
    
    setSourcePanel({
      isOpen: true,
      content: citation,
      url: url,
      title: url ? 'Source Document' : 'Source Content'
    });
  };

  const handleCloseSourcePanel = () => {
    setSourcePanel({ isOpen: false, content: null, title: null });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: { xs: "16px", sm: "20px", md: "24px" },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 193, 7, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 193, 7, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
          `,
          animation: "float 6s ease-in-out infinite",
          zIndex: 0,
        },
        "@keyframes float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      }}
    >
      {/* Header */}
      {showHeaderImage && (
        <Box
          sx={{
            textAlign: "center",
            marginBottom: { xs: "24px", sm: "32px", md: "36px" },
            marginTop: { xs: "8px", sm: "10px", md: "12px" },
            zIndex: 1,
            animation: "slideInDown 0.8s ease-out",
            "@keyframes slideInDown": {
              "0%": { transform: "translateY(-50px)", opacity: 0 },
              "100%": { transform: "translateY(0)", opacity: 1 },
            },
            "@keyframes glowAnimation": {
              "0%": { filter: "drop-shadow(0 0 5px rgba(255, 193, 7, 0.2))" },
              "50%": { filter: "drop-shadow(0 0 20px rgba(255, 193, 7, 0.4))" },
              "100%": { filter: "drop-shadow(0 0 5px rgba(255, 193, 7, 0.2))" },
            }
          }}
        >
          <Box
            component="img"
            src={"/brag-logo-new.png"}
            //process.env.PUBLIC_URL + 
            alt="BRAG Logo"
            sx={{
              width: { xs: "200px", sm: "240px", md: "280px" },
              maxWidth: "90vw",
              height: "auto",
              animation: "glowAnimation 3s ease-in-out infinite",
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
              }
            }}
          />
        </Box>
      )}

      {/* Main Content Container */}
      <Box
        sx={{
          width: "100%",
          maxWidth: sourcePanel.isOpen ? "95vw" : { xs: "95vw", sm: "90vw", md: "800px" },
          height: { xs: "70vh", sm: "75vh" },
          minHeight: "400px",
          maxHeight: "calc(100vh - 200px)",
          display: "flex",
          gap: sourcePanel.isOpen ? "16px" : 0,
          zIndex: 1,
          transition: "all 0.3s ease",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Chat Container */}
        <Paper
          elevation={8}
          sx={{
            width: sourcePanel.isOpen ? "60%" : "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: { xs: "16px", sm: "20px" },
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(59, 130, 246, 0.1)",
            animation: "slideInUp 0.8s ease-out 0.2s both",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 12px 40px rgba(59, 130, 246, 0.15)",
              transform: sourcePanel.isOpen ? "none" : "translateY(-4px)",
            },
            "@keyframes slideInUp": {
              "0%": { transform: "translateY(50px)", opacity: 0 },
              "100%": { transform: "translateY(0)", opacity: 1 },
            },
          }}
        >
        {/* Chat Header */}
        <Box
          sx={{
            background: "linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)",
            color: "white",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.1) 50%, transparent 100%)",
              animation: "shimmer 3s ease-in-out infinite",
            },
            "@keyframes shimmer": {
              "0%, 100%": { transform: "translateX(-100%)" },
              "50%": { transform: "translateX(100%)" },
            },
          }}
        >
          <Box
            component="img"
            src="/chat-bubble-logo.png"
            alt="Chat"
            sx={{
              height: "24px",
              width: "auto",
              zIndex: 1,
              filter: "brightness(0) invert(1)",
              opacity: 0.9,
            }}
          />
          <Button
            disabled={history.length === 0}
            startIcon={<AddIcon />}
            onClick={handleNewChatClick}
            onDoubleClick={handleNewChatDoubleClick}
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.8)",
              zIndex: 1,
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: "white",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(255, 255, 255, 0.2)",
              },
              "&:disabled": {
                borderColor: "rgba(255, 255, 255, 0.3)",
                color: "rgba(255, 255, 255, 0.5)",
              },
            }}
            variant="outlined"
            size="small"
          >
            New Chat
          </Button>
        </Box>

        {/* Chat Messages Area */}
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Chat 
            history={history} 
            onOpenSourcePanel={enableSourcePanel ? handleOpenSourcePanel : null} 
          />
        </Box>


        {/* Input Area */}
        <Box
          sx={{
            padding: "16px 24px",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            borderTop: "1px solid rgba(59, 130, 246, 0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "white",
              borderRadius: "25px",
              padding: "8px 16px",
              boxShadow: "0 2px 12px rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.15)",
            }}
          >
            <TextField
              disabled={spinner || !baseUrl}
              variant="standard"
              placeholder={baseUrl ? "Type your message..." : "Please configure API settings first"}
              value={question}
              onChange={(e) => setQuestion(e.target?.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={4}
              sx={{
                flex: 1,
                "& .MuiInput-underline:before": { display: "none" },
                "& .MuiInput-underline:after": { display: "none" },
                "& .MuiInputBase-input": {
                  padding: "8px 0",
                  fontSize: "15px",
                  color: "#374151",
                  "&::placeholder": {
                    color: "#9ca3af",
                    opacity: 0.8,
                  },
                },
              }}
            />
            <IconButton
              disabled={spinner || !baseUrl || !question.trim()}
              onClick={handleSendQuestion}
              sx={{
                backgroundColor: baseUrl && question.trim() ? "#3b82f6" : "rgba(0, 0, 0, 0.1)",
                color: "white",
                width: "36px",
                height: "36px",
                minWidth: "36px",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: baseUrl && question.trim() ? "#1d4ed8" : "rgba(0, 0, 0, 0.2)",
                  transform: baseUrl && question.trim() ? "scale(1.05)" : "none",
                  boxShadow: baseUrl && question.trim() ? "0 4px 12px rgba(59, 130, 246, 0.4)" : "none",
                },
                "&:disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  color: "rgba(0, 0, 0, 0.3)",
                },
                "&:active": {
                  transform: baseUrl && question.trim() ? "scale(0.95)" : "none",
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
        </Paper>

        {/* Source Panel */}
        {sourcePanel.isOpen && (
          <Paper
            elevation={8}
            sx={{
              width: "40%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: { xs: "16px", sm: "20px" },
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.1)",
              animation: "slideInRight 0.3s ease-out",
              "@keyframes slideInRight": {
                "0%": { transform: "translateX(100%)", opacity: 0 },
                "100%": { transform: "translateX(0)", opacity: 1 },
              },
            }}
          >
            {/* Source Panel Header */}
            <Box
              sx={{
                background: "linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)",
                color: "white",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: "600",
                  fontSize: "1.1rem",
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                {sourcePanel.title}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {sourcePanel.url && (
                  <IconButton
                    onClick={() => window.open(sourcePanel.url, '_blank')}
                    sx={{
                      color: "white",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                      },
                    }}
                    title="Open in new tab"
                  >
                    <OpenInNewIcon sx={{ fontSize: "18px" }} />
                  </IconButton>
                )}
                <IconButton
                  onClick={handleCloseSourcePanel}
                  sx={{
                    color: "white",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </Box>
                </IconButton>
              </Box>
            </Box>

            {/* Source Panel Content */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "linear-gradient(to bottom, #eff6ff, #ffffff)",
              }}
            >
              {sourcePanel.url ? (
                <>
                  {/* URL Display */}
                  <Box sx={{ padding: "16px 24px", borderBottom: "1px solid rgba(0, 0, 0, 0.1)" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "12px",
                        color: "#6b7280",
                        wordBreak: "break-all",
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                      }}
                    >
                      {sourcePanel.url}
                    </Typography>
                  </Box>
                  {/* Iframe */}
                  <Box sx={{ flex: 1, position: "relative" }}>
                    <Box
                      component="iframe"
                      src={sourcePanel.url}
                      sx={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        backgroundColor: "white",
                      }}
                      onError={(e) => {
                        console.log("Iframe failed to load:", e);
                      }}
                    />
                  </Box>
                </>
              ) : (
                /* Text Content */
                <Box sx={{ padding: "24px", overflowY: "auto" }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "#374151",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {sourcePanel.content}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Quick Access Button */}
      <IconButton
        onClick={() => {
          const quickSetupUrl = "https://eogeslxp5e.execute-api.us-east-2.amazonaws.com/prod/";
          setBaseUrl(quickSetupUrl);
          
          // Find Claude 3 Sonnet model
          const claudeModel = modelList.find(model => 
            model.modelId.includes('claude-3-sonnet') || 
            model.modelName.toLowerCase().includes('claude') && model.modelName.toLowerCase().includes('sonnet')
          );
          
          if (claudeModel) {
            setSelectedModel(claudeModel);
          }
          
          // Show confirmation message
          setShowQuickConfigSnackbar(true);
        }}
        sx={{
          position: "fixed",
          bottom: "20px",
          right: "80px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          zIndex: 2,
          width: "48px",
          height: "48px",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "rgb(236, 255, 249)",
            boxShadow: "0 4px 16px rgba(16, 185, 129, 0.4)",
            transform: "translateY(-2px)",
          },
        }}
        title="Quick Configure"
      >
        <FlashOnIcon sx={{ color: "rgba(16, 185, 129, 0.9)", fontSize: "20px" }} />
      </IconButton>

      {/* Developer Settings Button */}
      <IconButton
        onClick={(e) => setDevSettingsAnchor(e.currentTarget)}
        sx={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          zIndex: 2,
          width: "48px",
          height: "48px",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 1)",
            boxShadow: "0 4px 16px rgba(59, 130, 246, 0.2)",
            transform: "translateY(-2px)",
          },
        }}
      >
        <SettingsIcon sx={{ color: "#3b82f6", fontSize: "20px" }} />
      </IconButton>

      {/* Developer Settings Popup */}
      <Popover
        open={Boolean(devSettingsAnchor)}
        anchorEl={devSettingsAnchor}
        onClose={() => setDevSettingsAnchor(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPopover-paper': {
            borderRadius: '24px',
            padding: '0',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.15),
              0 1px 0 rgba(255, 255, 255, 0.9) inset,
              0 -1px 0 rgba(255, 255, 255, 0.3) inset,
              0 0 0 1px rgba(255, 255, 255, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.4)',
            marginBottom: '8px',
            maxWidth: '420px',
            minWidth: '380px',
            maxHeight: '80vh',
            position: 'relative',
            overflow: 'hidden',
          }
        }}
      >
        <Box 
          sx={{ 
            padding: '24px',
            maxHeight: '80vh',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(59, 130, 246, 0.3)',
              borderRadius: '3px',
              '&:hover': {
                background: 'rgba(59, 130, 246, 0.5)',
              },
            },
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <SettingsIcon sx={{ color: '#3b82f6', marginRight: '8px' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#1e40af', 
                fontWeight: '600',
                fontSize: '1.1rem',
              }}
            >
              Developer Settings
            </Typography>
            {baseUrl && selectedModel && (
              <Typography
                variant="caption"
                sx={{
                  marginLeft: 'auto',
                  color: '#22c55e',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                ● Connected
              </Typography>
            )}
          </Box>

          {/* API Configuration */}
          <QAHeader
            setBaseUrl={setBaseUrl}
            baseUrl={baseUrl}
            modelList={modelList}
            setSelectedModel={handleChangeModel}
            selectedModel={selectedModel}
          />
          
          {/* Quick Setup Button */}
          <Box sx={{ marginTop: '16px' }}>
            <Button
              variant="contained"
              onClick={() => {
                const quickSetupUrl = "https://eogeslxp5e.execute-api.us-east-2.amazonaws.com/prod/";
                setBaseUrl(quickSetupUrl);
                
                // Find Claude 3 Sonnet model
                const claudeModel = modelList.find(model => 
                  model.modelId.includes('claude-3-sonnet') || 
                  model.modelName.toLowerCase().includes('claude') && model.modelName.toLowerCase().includes('sonnet')
                );
                
                if (claudeModel) {
                  setSelectedModel(claudeModel);
                }
              }}
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
                width: '100%',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              Quick Setup (Autofill API URL & Claude 3 Sonnet)
            </Button>
          </Box>

          {/* UI Settings */}
          <Box sx={{ marginTop: '20px' }}>
            <Typography variant="h6" sx={{ color: '#1e40af', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
              UI Settings
            </Typography>
            
            {/* Source Panel Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                  Source Panel (Experimental)
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px' }}>
                  Open sources in a side panel instead of new tabs. S3 non-website documents currently do not work, but this is due to how S3 files are currently linked as a source. [ref GAI-38]
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={enableSourcePanel}
                onChange={(e) => setEnableSourcePanel(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#3b82f6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#93c5fd',
                  },
                }}
              />
            </Box>

            <spacer></spacer>

            {/* Header Image Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '12px' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                  Show Header Logo
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px' }}>
                  Display the large logo at the top of the page. (now broken)
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={showHeaderImage}
                onChange={(e) => setShowHeaderImage(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#3b82f6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#93c5fd',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Web URL Configuration */}
          {hasWebDataSource && (
            <Box sx={{ marginTop: '20px' }}>
              <UrlSourcesForm
                exclusionFilters={sourceUrlInfo.exclusionFilters}
                inclusionFilters={sourceUrlInfo.inclusionFilters}
                seedUrlList={sourceUrlInfo.seedUrlList.map(
                  (urlObj) => urlObj.url
                )}
                handleUpdateUrls={handleUpdateUrls}
              />
            </Box>
          )}
        </Box>
      </Popover>

      {/* New Chat Confirmation Popover */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handleCancelNewChat}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPopover-paper': {
            borderRadius: '12px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginTop: '8px',
            maxWidth: '280px',
            position: 'relative',
          }
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '14px',
              fontSize: '13px',
              fontWeight: '600',
              lineHeight: 1.4,
            }}
          >
            Start a new chat? This will clear your current conversation.
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <Button 
              onClick={handleCancelNewChat}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: '8px',
                fontSize: '12px',
                padding: '6px 12px',
                minWidth: '60px',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                color: '#3b82f6',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(59, 130, 246, 0.1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  borderColor: '#3b82f6',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmNewChat}
              size="small"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '8px',
                fontSize: '12px',
                padding: '6px 12px',
                minWidth: '60px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 3px 12px rgba(59, 130, 246, 0.4)',
                }
              }}
            >
              Start New Chat
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Double-click Success Snackbar */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          variant="filled"
          sx={{
            borderRadius: '8px',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          New chat started
        </Alert>
      </Snackbar>

      {/* Quick Configure Success Snackbar */}
      <Snackbar
        open={showQuickConfigSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseQuickConfigSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseQuickConfigSnackbar} 
          severity="success" 
          variant="filled"
          sx={{
            borderRadius: '8px',
            backgroundColor: '#10b981',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          Quick configuration applied successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;
