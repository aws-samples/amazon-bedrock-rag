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
        sx={{ width: "100%", paddingBottom: "25px" }}
      >
        1. Input your base url here:
      </Typography>
      <OutlinedInput
        id="standard-basic"
        value={url}
        sx={{ width: "100%" }}
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
            >
              <InputIcon />
            </IconButton>
          </InputAdornment>
        }
      />
      <br></br>
      <br></br>
      <Divider />
      <br></br>
      <Typography
        variant="overline"
        sx={{ width: "100%", paddingBottom: "10px" }}
      >
        2. Select a model
      </Typography>
      <Alert severity="info">
        Make sure to check in your AWS console that you have access to the
        selected model. Note: if no model is selected, the default model used
        will be anthropic.claude-instant-v1. Check out the list of supported
        models and regions{" "}
        <a
          href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-supported.html"
          target="_blank"
          rel="noreferrer"
        >
          here
        </a>
      </Alert>
      <br></br>
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
              <Typography {...props} variant="standard">
                {option.modelName} : {option.modelId}{" "}
              </Typography>
            )}
            sx={{ width: "100%" }}
            renderInput={(params) => (
              <TextField {...params} label="Choose a Model" />
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
