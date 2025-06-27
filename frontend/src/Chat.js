import {
  Box,
  Typography,
  Avatar,
  Fade,
  Chip,
  Grow,
  Paper,
  Collapse,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import LinkIcon from "@mui/icons-material/Link";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { IconButton } from "@mui/material";
import './animations.css';

const TypingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Box className="typing-dots" sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </Box>
    <Typography 
      variant="caption" 
      sx={{ 
        color: '#9ca3af', 
        fontSize: '12px',
        fontStyle: 'italic',
        opacity: 0.8
      }}
    >
      AI is typing...
    </Typography>
  </Box>
);

const Chat = (props) => {
  const history = props.history;
  const boxRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackStates, setFeedbackStates] = useState({});
  const [detailedFeedback, setDetailedFeedback] = useState({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState({});
  const [expandedErrors, setExpandedErrors] = useState({});

  // Format timestamp to 12-hour format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return new Date().toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // Get or generate timestamp for message
  const getMessageTimestamp = (msg, index) => {
    // If message already has timestamp, use it
    if (msg.timestamp) {
      return formatTimestamp(msg.timestamp);
    }
    
    // Generate timestamp based on current time minus some offset for older messages
    const now = new Date();
    const offsetMinutes = (history.length - index - 1) * 2; // 2 minutes between messages
    const messageTime = new Date(now.getTime() - (offsetMinutes * 60 * 1000));
    return formatTimestamp(messageTime);
  };

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [history]);

  // Helper functions for error handling
  const isServerError = (response) => {
    return response && response.includes("Server side error: please check function logs");
  };

  const handleErrorToggle = (index) => {
    setExpandedErrors(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Feedback categories
  const positiveFeedbackOptions = [
    { value: 'very_helpful', label: 'Very helpful' },
    { value: 'mostly_helpful', label: 'Mostly helpful' },
    { value: 'quick_accurate', label: 'Quick and accurate' },
    { value: 'well_explained', label: 'Well explained' },
    { value: 'other_positive', label: 'Other' }
  ];

  const negativeFeedbackOptions = [
    { value: 'completely_incorrect', label: 'Completely incorrect' },
    { value: 'partially_incorrect', label: 'Partially incorrect' },
    { value: 'irrelevant', label: 'Irrelevant to my question' },
    { value: 'unclear_confusing', label: 'Unclear or confusing' },
    { value: 'missing_information', label: 'Missing information' },
    { value: 'other_negative', label: 'Other' }
  ];

  const handleFeedbackClick = (index, type) => {
    const currentState = feedbackStates[index];
    const newState = currentState === type ? null : type;
    
    setFeedbackStates(prev => ({
      ...prev,
      [index]: newState
    }));

    // Initialize detailed feedback state if feedback is being given
    if (newState) {
      setDetailedFeedback(prev => ({
        ...prev,
        [index]: {
          type: newState,
          category: '',
          comment: '',
          showDetailed: true,
          submitted: false
        }
      }));
    } else {
      // Clear detailed feedback if main feedback is removed
      setDetailedFeedback(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }
  };

  const handleDetailedFeedbackChange = (index, field, value) => {
    setDetailedFeedback(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const submitDetailedFeedback = async (index) => {
    const feedback = detailedFeedback[index];
    const message = history[index];
    
    if (!feedback.category) return;

    setFeedbackSubmitting(prev => ({ ...prev, [index]: true }));

    try {
      // TODO: Replace with actual API call
      const feedbackData = {
        messageIndex: index,
        question: message.question,
        response: message.response,
        feedbackType: feedback.type,
        category: feedback.category,
        comment: feedback.comment,
        timestamp: new Date().toISOString()
      };

      console.log('Submitting detailed feedback:', feedbackData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as submitted
      setDetailedFeedback(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          submitted: true,
          showDetailed: false
        }
      }));

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setDetailedFeedback(prev => {
          const newState = { ...prev };
          if (newState[index]) {
            newState[index].submitted = false;
          }
          return newState;
        });
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setFeedbackSubmitting(prev => ({ ...prev, [index]: false }));
    }
  };

  const formatCitation = (citation) => {
    if (!citation) return null;
    
    // Try to extract URL from citation if it contains one
    const urlMatch = citation.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return urlMatch[0];
    }
    return citation;
  };

  return (
    <Box
      ref={boxRef}
      sx={{
        height: "100%",
        overflowY: "auto",
        padding: "24px",
        background: "linear-gradient(to bottom, #eff6ff, #ffffff)",
        display: "flex",
        flexDirection: "column",
        scrollBehavior: "smooth",
      }}
    >
      {history?.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {history?.map((msg, index) => (
            <Grow 
              in={true} 
              timeout={600} 
              style={{ transformOrigin: '0 0 0' }}
              key={index}
            >
              <Box
                sx={{
                  animation: `messageSlide 0.5s ease-out ${index * 0.1}s both`,
                  "@keyframes messageSlide": {
                    "0%": { 
                      transform: "translateY(20px)", 
                      opacity: 0 
                    },
                    "100%": { 
                      transform: "translateY(0)", 
                      opacity: 1 
                    },
                  },
                }}
              >
                {/* User Message */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                    gap: "10px",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        fontWeight: "500",
                        marginBottom: "2px",
                      }}
                    >
                      {getMessageTimestamp(msg, index)}
                    </Typography>
                    <Box
                      sx={{
                        maxWidth: "70%",
                        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                        color: "white",
                        borderRadius: "18px 18px 4px 18px",
                        padding: "12px 16px",
                        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                        position: "relative",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: "15px",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          fontWeight: "400",
                        }}
                      >
                        {msg.question}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* AI Response */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: "#fbbf24",
                      color: "white",
                      fontSize: "14px",
                      marginTop: "4px",
                      boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
                    }}
                  >
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* AI Bot Name and Timestamp */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        AI Bot
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          fontWeight: "500",
                        }}
                      >
                        {getMessageTimestamp(msg, index)}
                      </Typography>
                    </Box>
                    {/* Check if this is a server error */}
                    {isServerError(msg.response) && !msg.isLoading ? (
                      /* Error Message Bubble */
                      <Box
                        onClick={() => handleErrorToggle(index)}
                        sx={{
                          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                          color: "white",
                          borderRadius: "18px 18px 18px 4px",
                          padding: "12px 16px",
                          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                          border: "2px solid rgba(251, 191, 36, 0.3)",
                          position: "relative",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          animation: "errorPulse 2s ease-in-out infinite",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)",
                            borderColor: "rgba(251, 191, 36, 0.5)",
                          },
                          "@keyframes errorPulse": {
                            "0%, 100%": { 
                              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)" 
                            },
                            "50%": { 
                              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.5)" 
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <WarningAmberIcon sx={{ fontSize: '18px', color: 'white' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontSize: "15px",
                                lineHeight: 1.5,
                                fontWeight: "500",
                                marginBottom: "2px",
                              }}
                            >
                              The server is not available right now.
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "13px",
                                opacity: 0.9,
                                lineHeight: 1.4,
                              }}
                            >
                              Please try again in a moment.
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {expandedErrors[index] ? (
                              <ExpandLessIcon sx={{ fontSize: '18px', opacity: 0.8 }} />
                            ) : (
                              <ExpandMoreIcon sx={{ fontSize: '18px', opacity: 0.8 }} />
                            )}
                          </Box>
                        </Box>
                        
                        {/* Expandable Technical Details */}
                        <Collapse in={expandedErrors[index]}>
                          <Box sx={{ 
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "11px",
                                opacity: 0.8,
                                fontFamily: 'monospace',
                                display: 'block',
                                marginBottom: '4px',
                                color: 'rgba(255, 255, 255, 0.7)'
                              }}
                            >
                              Technical Details:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "12px",
                                fontFamily: 'monospace',
                                wordBreak: "break-all",
                                lineHeight: 1.4,
                                color: 'rgba(255, 255, 255, 0.9)'
                              }}
                            >
                              {msg.response}
                            </Typography>
                          </Box>
                        </Collapse>
                      </Box>
                    ) : (
                      /* Normal Message Bubble */
                      <Box
                        sx={{
                          backgroundColor: "white",
                          color: "#374151",
                          borderRadius: "18px 18px 18px 4px",
                          padding: "12px 16px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.1)",
                          position: "relative",
                          // Removed triangle
                        }}
                      >
                        {msg.isLoading ? (
                          <Box sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            height: '24px',
                            py: 1
                          }}>
                            <TypingIndicator />
                          </Box>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              fontSize: "15px",
                              lineHeight: 1.6,
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              fontWeight: "400",
                            }}
                          >
                            {msg.response}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    {/* Citation */}
                    {msg.citation && (
                      <Chip
                        icon={<LinkIcon sx={{ color: "#3b82f6 !important" }} />}
                        label={formatCitation(msg.citation).length > 50 
                          ? `${formatCitation(msg.citation).substring(0, 50)}...` 
                          : formatCitation(msg.citation)
                        }
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const citation = formatCitation(msg.citation);
                          if (citation.startsWith('http')) {
                            window.open(citation, '_blank');
                          }
                        }}
                        sx={{
                          alignSelf: "flex-start",
                          fontSize: "11px",
                          height: "24px",
                          fontWeight: "500",
                          borderColor: "#3b82f6",
                          color: "#3b82f6",
                          backgroundColor: "rgba(59, 130, 246, 0.05)",
                          cursor: formatCitation(msg.citation).startsWith('http') ? 'pointer' : 'default',
                          transition: "all 0.3s ease",
                          "&:hover": {
                            backgroundColor: formatCitation(msg.citation).startsWith('http') 
                              ? "rgba(59, 130, 246, 0.1)" 
                              : "rgba(59, 130, 246, 0.05)",
                            borderColor: formatCitation(msg.citation).startsWith('http') 
                              ? "#1d4ed8" 
                              : "#3b82f6",
                            transform: formatCitation(msg.citation).startsWith('http') 
                              ? "translateY(-1px)" 
                              : "none",
                            boxShadow: formatCitation(msg.citation).startsWith('http') 
                              ? "0 2px 8px rgba(59, 130, 246, 0.2)" 
                              : "none",
                          },
                        }}
                      />
                    )}
                    
                    {/* Feedback Buttons */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: '6px', 
                      marginTop: '4px',
                      alignSelf: 'flex-start' 
                    }}>
                      <IconButton 
                        size="small" 
                        sx={{
                          color: '#6b7280',
                          padding: '3px',
                          minWidth: '24px',
                          width: '24px',
                          height: '24px',
                          '&[data-selected="true"]': {
                            color: '#3b82f6',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          }
                        }}
                        onClick={() => handleFeedbackClick(index, 'up')}
                        data-selected={feedbackStates[index] === 'up'}
                      >
                        <ThumbUpIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{
                          color: '#6b7280',
                          padding: '3px',
                          minWidth: '24px',
                          width: '24px',
                          height: '24px',
                          '&[data-selected="true"]': {
                            color: '#ef4444',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          }
                        }}
                        onClick={() => handleFeedbackClick(index, 'down')}
                        data-selected={feedbackStates[index] === 'down'}
                      >
                        <ThumbDownIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </Box>

                    {/* Detailed Feedback Section */}
                    <Collapse in={detailedFeedback[index]?.showDetailed && !detailedFeedback[index]?.submitted}>
                      <Box sx={{ 
                        marginTop: '8px',
                        padding: '12px',
                        backgroundColor: 'rgba(248, 250, 252, 0.8)',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.1)',
                        maxWidth: '350px'
                      }}>
                        <FormControl component="fieldset" sx={{ width: '100%' }}>
                          <FormLabel 
                            component="legend" 
                            sx={{ 
                              fontSize: '13px', 
                              fontWeight: '600',
                              color: '#374151',
                              marginBottom: '8px'
                            }}
                          >
                            {feedbackStates[index] === 'up' ? 'What made this helpful?' : 'What was the issue?'}
                          </FormLabel>
                          <RadioGroup
                            value={detailedFeedback[index]?.category || ''}
                            onChange={(e) => handleDetailedFeedbackChange(index, 'category', e.target.value)}
                            sx={{ gap: '2px' }}
                          >
                            {(feedbackStates[index] === 'up' ? positiveFeedbackOptions : negativeFeedbackOptions).map((option) => (
                              <FormControlLabel
                                key={option.value}
                                value={option.value}
                                control={
                                  <Radio 
                                    size="small" 
                                    sx={{ 
                                      color: '#9ca3af',
                                      padding: '4px',
                                      '&.Mui-checked': {
                                        color: feedbackStates[index] === 'up' ? '#3b82f6' : '#ef4444'
                                      }
                                    }} 
                                  />
                                }
                                label={
                                  <Typography sx={{ fontSize: '12px', color: '#4b5563' }}>
                                    {option.label}
                                  </Typography>
                                }
                                sx={{ margin: '1px 0', minHeight: '28px' }}
                              />
                            ))}
                          </RadioGroup>

                          {/* Optional Comment Field */}
                          {(detailedFeedback[index]?.category?.includes('other') || detailedFeedback[index]?.category) && (
                            <TextField
                              multiline
                              rows={2}
                              placeholder="Additional comments (optional)"
                              value={detailedFeedback[index]?.comment || ''}
                              onChange={(e) => handleDetailedFeedbackChange(index, 'comment', e.target.value)}
                              sx={{
                                marginTop: '8px',
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '12px',
                                  backgroundColor: 'white',
                                  '& fieldset': {
                                    borderColor: 'rgba(59, 130, 246, 0.2)',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: 'rgba(59, 130, 246, 0.3)',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#3b82f6',
                                  },
                                }
                              }}
                            />
                          )}

                          {/* Submit Button */}
                          <Box sx={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              onClick={() => handleDetailedFeedbackChange(index, 'showDetailed', false)}
                              sx={{
                                color: '#6b7280',
                                fontSize: '11px',
                                textTransform: 'none',
                                minWidth: 'auto',
                                padding: '3px 6px'
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!detailedFeedback[index]?.category || feedbackSubmitting[index]}
                              onClick={() => submitDetailedFeedback(index)}
                              startIcon={
                                feedbackSubmitting[index] ? 
                                  <CircularProgress size={10} color="inherit" /> : 
                                  <SendIcon sx={{ fontSize: '12px' }} />
                              }
                              sx={{
                                backgroundColor: feedbackStates[index] === 'up' ? '#3b82f6' : '#ef4444',
                                fontSize: '11px',
                                textTransform: 'none',
                                minWidth: 'auto',
                                padding: '4px 8px',
                                '&:hover': {
                                  backgroundColor: feedbackStates[index] === 'up' ? '#1d4ed8' : '#dc2626',
                                },
                                '&:disabled': {
                                  backgroundColor: '#9ca3af',
                                }
                              }}
                            >
                              Submit
                            </Button>
                          </Box>
                        </FormControl>
                      </Box>
                    </Collapse>

                    {/* Feedback Submitted Confirmation */}
                    <Collapse in={detailedFeedback[index]?.submitted}>
                      <Box sx={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        maxWidth: '250px'
                      }}>
                        <CheckCircleIcon sx={{ fontSize: '14px', color: '#3b82f6' }} />
                        <Typography sx={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '500' }}>
                          Thank you for your feedback!
                        </Typography>
                      </Box>
                    </Collapse>

                    {/* Add bottom margin for last message */}
                    {index === history.length - 1 && (
                      <Box sx={{ marginBottom: '32px' }} />
                    )}
                  </Box>
                </Box>
              </Box>
            </Grow>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            textAlign: "center",
            padding: { xs: "20px 16px", sm: "32px 20px", md: "40px 20px" },
            minHeight: "300px",
            animation: "fadeInUp 0.8s ease-out",
            "@keyframes fadeInUp": {
              "0%": { 
                transform: "translateY(30px)", 
                opacity: 0 
              },
              "100%": { 
                transform: "translateY(0)", 
                opacity: 1 
              },
            },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              padding: { 
                xs: "32px 24px", 
                sm: "40px 32px", 
                md: "48px 40px" 
              },
              borderRadius: { xs: "20px", sm: "24px" },
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.08)",
              maxWidth: { xs: "90%", sm: "85%", md: "500px" },
              width: "100%",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.4s ease",
              animation: "float 6s ease-in-out infinite",
              "&:hover": {
                transform: "translateY(-8px)",
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.12)",
                border: "1px solid rgba(59, 130, 246, 0.15)",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                  radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(251, 191, 36, 0.03) 0%, transparent 50%)
                `,
                zIndex: 0,
              },
              "@keyframes float": {
                "0%, 100%": { transform: "translateY(0px)" },
                "50%": { transform: "translateY(-4px)" },
              },
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              {/* Enhanced Icon with Background */}
              <Box
                sx={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 32px",
                  boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)",
                  position: "relative",
                  animation: "iconPulse 4s ease-in-out infinite",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "-4px",
                    left: "-4px",
                    right: "-4px",
                    bottom: "-4px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.2) 100%)",
                    zIndex: -1,
                    animation: "iconGlow 4s ease-in-out infinite",
                  },
                  "@keyframes iconPulse": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.05)" },
                  },
                  "@keyframes iconGlow": {
                    "0%, 100%": { opacity: 0.5 },
                    "50%": { opacity: 0.8 },
                  },
                }}
              >
                <FindInPageIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: "white",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                  }} 
                />
              </Box>

              {/* Main Heading */}
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: "800",
                  background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: "12px",
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "1.75rem", sm: "2rem" },
                }}
              >
                Find What You Need
              </Typography>

              {/* Subtitle */}
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: "#3b82f6",
                  fontWeight: "600",
                  marginBottom: "20px",
                  fontSize: "1rem",
                  letterSpacing: "0.01em",
                }}
              >
                Your Knowledge Assistant
              </Typography>

              {/* Description */}
              <Typography 
                variant="body1" 
                sx={{ 
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: "15px",
                  marginBottom: "28px",
                  maxWidth: "420px",
                  margin: "0 auto 28px",
                }}
              >
                Search through company documentation, policies, and procedures. Ask questions naturally and get reliable answers from our secure knowledge base.
              </Typography>

              {/* Example Search Suggestions */}
              
              {/* <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {["Company Policies", "HR Procedures", "Technical Docs"].map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(59, 130, 246, 0.08)",
                      color: "#3b82f6",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      fontSize: "12px",
                      fontWeight: "500",
                      transition: "all 0.3s ease",
                      animation: `chipFadeIn 0.6s ease-out ${index * 0.1 + 0.5}s both`,
                      "&:hover": {
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
                      },
                      "@keyframes chipFadeIn": {
                        "0%": { opacity: 0, transform: "translateY(10px)" },
                        "100%": { opacity: 1, transform: "translateY(0)" },
                      },
                    }}
                  />
                ))}
              </Box> */}
              
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

Chat.propTypes = { history: PropTypes.array };
Chat.defaultProps = { history: [] };

export default Chat;
