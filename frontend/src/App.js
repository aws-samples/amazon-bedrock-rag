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
  const [showDevSettings, setShowDevSettings] = useState(true);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

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
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    // Double-click detection (within 300ms)
    if (timeDiff < 300 && timeDiff > 0) {
      // Double-click: immediately start new chat
      setHistory([]);
      setShowSnackbar(true);
      setPopoverAnchor(null);
    } else {
      // Single click: show popover
      setPopoverAnchor(event.currentTarget);
    }
    
    setLastClickTime(currentTime);
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

      {/* Main Chat Container */}
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: { xs: "95vw", sm: "90vw", md: "800px" },
          height: { xs: "70vh", sm: "75vh" },
          minHeight: "400px",
          maxHeight: "calc(100vh - 200px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: { xs: "16px", sm: "20px" },
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          zIndex: 1,
          animation: "slideInUp 0.8s ease-out 0.2s both",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 12px 40px rgba(59, 130, 246, 0.15)",
            transform: "translateY(-4px)",
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
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: "600",
              zIndex: 1,
              fontSize: "1.1rem",
              letterSpacing: "-0.01em",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Chat
          </Typography>
          <Button
            disabled={history.length === 0}
            startIcon={<AddIcon />}
            onClick={handleNewChatClick}
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
          <Chat history={history} />
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

      {/* Developer Settings Toggle */}
      <Box
        sx={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          zIndex: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#6b7280",
            fontWeight: "500",
          }}
        >
          Developer Tools
        </Typography>
        <Switch
          size="small"
          checked={showDevSettings}
          onChange={(e) => setShowDevSettings(e.target.checked)}
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

      {/* Developer Tools Section */}
      {showDevSettings && (
        <Box 
          sx={{ 
          width: "100%", 
          maxWidth: "800px", 
          marginTop: "24px",
          zIndex: 1,
          animation: "slideInUp 0.8s ease-out 0.3s both",
          "@keyframes slideInUp": {
            "0%": { transform: "translateY(50px)", opacity: 0 },
            "100%": { transform: "translateY(0)", opacity: 1 },
          },
        }}
      >
        <Accordion
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "20px",
            "&:before": { display: "none" },
            border: "1px solid rgba(59, 130, 246, 0.2)",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 8px 25px rgba(59, 130, 246, 0.15)",
              transform: "translateY(-2px)",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#3b82f6" }} />}
            sx={{
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              borderRadius: "20px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "rgba(59, 130, 246, 0.1)",
              },
              "& .MuiAccordionSummary-content": {
                alignItems: "center",
              },
            }}
          >
            <SettingsIcon 
              sx={{ 
                marginRight: "10px", 
                color: "#3b82f6",
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: "#1e40af", 
                fontWeight: "600",
                fontSize: "1rem",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              Developer Settings
            </Typography>
            {baseUrl && selectedModel && (
              <Typography
                variant="caption"
                sx={{
                  marginLeft: "auto",
                  marginRight: "20px",
                  color: "#22c55e",
                  fontWeight: "bold",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  padding: "4px 8px",
                  borderRadius: "20px",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                ● Connected
              </Typography>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ padding: "20px" }}>
            <QAHeader
              setBaseUrl={setBaseUrl}
              baseUrl={baseUrl}
              modelList={modelList}
              setSelectedModel={handleChangeModel}
              selectedModel={selectedModel}
            />
            {hasWebDataSource && (
              <Box sx={{ marginTop: "20px" }}>
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
          </AccordionDetails>
        </Accordion>
      </Box>
      )}

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
    </Box>
  );
};

export default App;
