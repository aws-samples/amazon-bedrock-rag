import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { QAHeader } from "./QAHeader";
import Chat from "./Chat";
import { useState, useEffect } from "react";
import { TextField, Typography } from "@mui/material";
import * as React from "react";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import LoadingSpinner from "./Spinner";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";
import UrlSourcesForm from "./WebUrlsForm";
import {modelList} from "./RAGModels"

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
    setSpinner(true);

    fetch(baseUrl + "docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestSessionId: sessionId,
        question: question,
        modelId: selectedModel?.modelId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data", data);
        setSpinner(false);
        setSessionId(data.sessionId);
        setHistory([
          ...history,
          {
            question: question,
            response: data.response,
            citation: data.citation,
          },
        ]);
      })
      .catch((err) => {
        setSpinner(false);
        setHistory([
          ...history,
          {
            question: question,
            response:
              "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
            citation: undefined,
          },
        ]);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendQuestion();
    }
  };

  const onClearHistory = () => setHistory([]);

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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "30px",
        backgroundColor: "#f0f0f0",
      }}
    >
      <Paper
        sx={{
          padding: 8,
          maxWidth: 600,
        }}
      >
        <Typography variant="h5" sx={{ textAlign: "center" }}>
          AWS Q&A
        </Typography>
        <br></br>
        <br></br>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <QAHeader
            setBaseUrl={setBaseUrl}
            baseUrl={baseUrl}
            modelList={modelList}
            setSelectedModel={handleChangeModel}
            selectedModel={selectedModel}
          />
          <Divider />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "10px",
              paddingTop: "20px",
            }}
          >
            <Typography variant="overline">3. Ask a question:</Typography>
            <Button
              disabled={history.length === 0}
              startIcon={<DeleteIcon />}
              onClick={onClearHistory}
            >
              Clear History
            </Button>
          </Box>
          <Chat history={history} />
          <br></br>
          {spinner ? (
            <Box sx={{ justifyContent: "center", padding: "20px" }}>
              <LoadingSpinner />
            </Box>
          ) : (
            <br></br>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "20px",
            paddingTop: "20px",
          }}
        >
          <TextField
            disabled={spinner || !baseUrl}
            variant="standard"
            label="Enter your question here"
            value={question}
            onChange={(e) => setQuestion(e.target?.value)}
            onKeyDown={handleKeyDown}
            sx={{ width: "95%" }}
          />
          <IconButton
            disabled={spinner || !baseUrl}
            onClick={handleSendQuestion}
            color="primary"
          >
            <SendIcon />
          </IconButton>
        </Box>
        {hasWebDataSource ? (
          <Box sx={{ paddingTop: "15px" }}>
            <UrlSourcesForm
              exclusionFilters={sourceUrlInfo.exclusionFilters}
              inclusionFilters={sourceUrlInfo.inclusionFilters}
              seedUrlList={sourceUrlInfo.seedUrlList.map(
                (urlObj) => urlObj.url
              )}
              handleUpdateUrls={handleUpdateUrls}
            />
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
};

export default App;
