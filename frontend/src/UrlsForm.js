import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Accordion,
  AccordionActions,
  AccordionSummary,
  Typography,
  Stack,
  IconButton,
  Snackbar,
  Alert
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";

const UrlSourcesForm = (props) => {
  const { exclusionFilters, inclusionFilters, seedUrlList, handleUpdateUrls } =
    props;
  const [urls, setUrls] = useState(seedUrlList ? seedUrlList : []);
  const [newExclusionFilters, setExclusionFilters] = useState(
    exclusionFilters ? exclusionFilters : []
  );
  const [newInclusionFilters, setInclusionFilters] = useState(
    inclusionFilters ? inclusionFilters : []
  );
  const [isMaxNumUrls, setIsMaxNumUrls] = useState(seedUrlList.length >= 10);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);


  const validateURL = (url) => {
    const regex = new RegExp(
      "^(https?:\\/\\/)?" +
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" +
        "((\\d{1,3}\\.){3}\\d{1,3}))" +
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
        "(\\?[;&a-z\\d%_.~+=-]*)?" +
        "(\\#[-a-z\\d_]*)?$",
      "i"
    );
    return regex.test(url);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedUrls = urls
      .map((url) => url?.trim())
      .filter((url) => validateURL(url));

    const isUpdated = await handleUpdateUrls(
      cleanedUrls,
      newExclusionFilters,
      newInclusionFilters
    );
    setSuccess(isUpdated);
    setOpen(true);
  };

  const handleUrlUpdate = (newUrl, index) => {
    const newUrls = [...urls];
    newUrls[index] = newUrl;
    setUrls(newUrls);
  };

  const handleExclusionFilterUpdate = (filter, index) => {
    const newFilters = [...exclusionFilters];
    newFilters[index] = filter;
    setExclusionFilters(newFilters);
  };

  const handleInclusionFilterUpdate = (filter, index) => {
    const newFilters = [...inclusionFilters];
    newFilters[index] = filter;
    setInclusionFilters(newFilters);
  };

  const addUrlInput = () => {
    if (urls.length + 1 > 10) {
      return;
    }
    setIsMaxNumUrls(urls.length + 1 === 10);
    setUrls([...urls, ""]);
  };

  const removeUrlInput = () => {
    if (urls.length === 0) {
      return;
    }
    const newUrls = [...urls];
    newUrls.splice(newUrls.length - 1, 1);
    setUrls(newUrls);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  return (
    <div>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          Source URLs and Filters
        </AccordionSummary>
        <Box sx={{ padding: "20px" }}>
          <Typography variant="overline" >URL list:</Typography>
          <Stack sx={{ paddingBottom: "15px" }}>
            {urls?.length > 0
              ? urls?.map((url, index) => (
                  <TextField
                    variant="standard"
                    key={index}
                    label={`#${index + 1}`}
                    value={url}
                    onChange={(e) => handleUrlUpdate(e.target?.value, index)}
                    sx={{ width: "85%" }}
                  />
                ))
              : null}
            <Stack direction="row" sx={{ marginLeft: "auto" }}>
              <IconButton disabled={urls.length === 0} onClick={removeUrlInput}>
                <RemoveCircleIcon />
              </IconButton>
              <IconButton
                disabled={isMaxNumUrls}
                onClick={addUrlInput}
                color="primary"
              >
                <AddCircleIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Typography variant="overline">Exclusion Filters:</Typography>
          <Stack sx={{ paddingBottom: "15px" }}>
            {newExclusionFilters?.length > 0
              ? newExclusionFilters.map((filter, index) => (
                  <TextField
                    variant="standard"
                    value={filter}
                    key={index}
                    onChange={(e) =>
                      handleExclusionFilterUpdate(e.target?.value, index)
                    }
                    sx={{ width: "85%" }}
                  />
                ))
              : null}
            <Stack direction="row" sx={{ marginLeft: "auto" }}>
              <IconButton
                disabled={newExclusionFilters.length === 0}
                onClick={() => {
                  const filters = [...newExclusionFilters];
                  filters.splice(filters.length - 1, 1);
                  setExclusionFilters(filters);
                }}
              >
                <RemoveCircleIcon />
              </IconButton>
              <IconButton
                onClick={() =>
                  setExclusionFilters([...newExclusionFilters, ""])
                }
                color="primary"
              >
                <AddCircleIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Typography variant="overline">Inclusion Filters:</Typography>
          <Stack sx={{ paddingBottom: "15px" }}>
            {newInclusionFilters.length > 0
              ? newInclusionFilters.map((filter, index) => (
                  <TextField
                    variant="standard"
                    value={filter}
                    key={index}
                    onChange={(e) =>
                      handleInclusionFilterUpdate(e.target?.value, index)
                    }
                    sx={{ width: "85%" }}
                  />
                ))
              : null}
            <Stack direction="row" sx={{ marginLeft: "auto" }}>
              <IconButton
                disabled={newInclusionFilters.length === 0}
                onClick={() => {
                  const filters = [...newInclusionFilters];
                  filters.splice(filters.length - 1, 1);
                  setExclusionFilters(filters);
                }}
              >
                <RemoveCircleIcon />
              </IconButton>
              <IconButton
                onClick={() =>
                  setInclusionFilters([...newInclusionFilters, ""])
                }
                color="primary"
              >
                <AddCircleIcon />
              </IconButton>
            </Stack>
            <Alert severity="info">
          Note: Submitting urls and filters won't automatically sync the web data source. 
          The data source is updated on a recurring schedule and any submitted list of seed urls and filters will be considered for the upcoming sync. 
        </Alert>
          </Stack>

          <AccordionActions>
            <Button onClick={handleSubmit}>Update</Button>
          </AccordionActions>
        </Box>
      </Accordion>
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        {success ? (
          <Alert
            onClose={handleClose}
            severity="success"
            sx={{ width: "100%" }}
          >
            Successfully updated!
          </Alert>
        ) : (
          <Alert onClose={handleClose} severity="error" sx={{ width: "100%" }}>
            Update was unsuccessful. Make sure your base url is valid and/or
            your current data source is not in sync mode
          </Alert>
        )}
      </Snackbar>
    </div>
  );
};

export default UrlSourcesForm;
