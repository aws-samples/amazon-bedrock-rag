import { useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { Typography } from "@mui/material";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputIcon from "@mui/icons-material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import PropTypes from "prop-types";

export const QAHeader = (props) => {
  const { setSelectedModel, setBaseUrl, modelList, selectedModel, baseUrl } =
    props;
  const [url, setUrl] = useState(baseUrl ?? "");
  const modelListDisabledText =
    "Input a valid base url to enable model selection";

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      setBaseUrl(url);
    }
  };

  return (
    <div>
      <Typography
        variant="overline"
        sx={{ 
          width: "100%", 
          paddingBottom: "25px",
          letterSpacing: "0.1em",
          color: "#1e40af",
          fontWeight: "600",
          transition: "color 0.3s ease",
          "&:hover": {
            color: "#3b82f6"
          }
        }}
      >
        1. Input your base url here:
      </Typography>
      <OutlinedInput
        id="standard-basic"
        value={url}
        sx={{ 
          width: "100%",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)",
            borderColor: "#3b82f6"
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(59, 130, 246, 0.3)"
          }
        }}
        name="Base Url"
        onChange={(event) => setUrl(event.target?.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://example.execute-api.example.amazonaws.com/example/"
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              color="primary"
              onClick={() => setBaseUrl(url)}
              onMouseDown={() => setBaseUrl(url)}
              sx={{
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  transform: "scale(1.1)"
                }
              }}
            >
              <InputIcon />
            </IconButton>
          </InputAdornment>
        }
      />
      <br />
      <br />
      <Divider />
      <br />
      <Typography
        variant="overline"
        sx={{ 
          width: "100%", 
          paddingBottom: "10px",
          letterSpacing: "0.1em",
          color: "#1e40af",
          fontWeight: "600",
          transition: "color 0.3s ease",
          "&:hover": {
            color: "#3b82f6"
          }
        }}
      >
        2. Select a model
      </Typography>
      <Alert 
        severity="info" 
        sx={{
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)"
          },
          "& .MuiAlert-icon": {
            color: "#3b82f6"
          }
        }}
      >
        Make sure to check in your AWS console that you have access to the
        selected model. Note: if no model is selected, the default model used
        will be anthropic.claude-instant-v1. Check out the list of supported
        models and regions{" "}
        <a
          href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-supported.html"
          target="_blank"
          rel="noreferrer"
          style={{ 
            color: "#1d4ed8", 
            textDecoration: "none",
            fontWeight: "600",
            transition: "color 0.3s ease"
          }}
          onMouseOver={(e) => e.target.style.color = "#3b82f6"}
          onMouseOut={(e) => e.target.style.color = "#1d4ed8"}
        >
          here
        </a>
      </Alert>
      <br />
      <Box sx={{ paddingBottom: "20px" }}>
        <Tooltip title={modelList.length === 0 ? modelListDisabledText : null}>
          <Autocomplete
            disabled={!baseUrl}
            includeInputInList
            id="model-select"
            autoComplete
            options={modelList}
            getOptionLabel={(option) => option.modelId ?? option}
            renderOption={(props, option) => (
              <Box 
                {...props}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  transition: 'all 0.3s ease',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    transform: 'translateX(5px)',
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {option.modelName}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    opacity: 0.7,
                    transition: 'opacity 0.3s ease',
                    '&:hover': {
                      opacity: 1
                    }
                  }}
                >
                  {option.modelId}
                </Typography>
              </Box>
            )}
            sx={{ 
              width: "100%",
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)",
                  borderColor: "#3b82f6"
                },
                "&.Mui-focused": {
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)"
                }
              },
              "& .MuiInputLabel-root": {
                transition: "all 0.3s ease",
                "&.Mui-focused": {
                  color: "#3b82f6"
                }
              }
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Choose a Model" 
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(59, 130, 246, 0.3)"
                  }
                }}
              />
            )}
            defaultValue={null}
            value={selectedModel?.modelId ?? null}
            onChange={(event, value) => {
              setSelectedModel(value);
            }}
          />
        </Tooltip>
      </Box>
    </div>
  );
};

QAHeader.propTypes = {
  setSelectedModel: PropTypes.func.isRequired,
  setBaseUrl: PropTypes.func.isRequired,
  modelList: PropTypes.array,
  selectedModel: PropTypes.string,
  baseUrl: PropTypes.string,
};

QAHeader.defaultProps = {
  modelList: [],
  selectedModel: null,
  baseUrl: "",
};

export default QAHeader;
