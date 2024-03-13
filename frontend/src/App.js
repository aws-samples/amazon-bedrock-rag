import './App.css';
import { useState } from "react"

function App() {  
  const [baseUrl,setBaseUrl] = useState(undefined)
  const [genResponse,setGenResponse] = useState(undefined)
  const [genCitation,setGenCitation] = useState(undefined)
  const [spinner, setSpinner] = useState(false)  
  const [sessionId, setSessionId] = useState(undefined)
  const [history, setHistory] = useState([])
  

  return (
    <div >
      <div style={{ backgroundColor: "#e2e2e2", padding: "20px", margin: "10px"}}>    
        <strong style={{display: "block"}}>Step 1 - Enter API URL</strong><br/>
        <input type="text" id="urlinput" style={{width: "97%"}} placeholder="https://example.execute-api.example.amazonaws.com/example/" 
              onChange={(e) => {
                setBaseUrl(e.target?.value)
              }}
        />
      </div>  
      <div style={{ backgroundColor: "#e2e2e2", padding: "20px", margin: "10px"}}>
        <strong style={{display: "block"}}>Step 2 - Ask away!</strong><br/>
        <div><strong>Question: </strong><input type="text" id="question" style={{width: "90%"}} placeholder="Enter your question here..."
         onKeyDown={(e)=>{
          if (e.key === "Enter") { 
            setSpinner(true)
            setGenResponse("")    
            //docs is the name of the APIGateway resource used for sending the user query
            fetch(
              baseUrl + "docs",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ requestSessionId: sessionId, question: e.target?.value }),
              }
            )
              .then((res) => res.json())
              .then((data) => {             
                setSpinner(false)
                setGenResponse(data.response)    
                setGenCitation(data.citation)
                setSessionId(data.sessionId)
                setHistory([...history, {question: e.target?.value, response: data.response}])
                console.log(`Session ID: ${sessionId}`)
              })  
              .catch((err) => {
                setSpinner(false)
                setGenResponse('Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.')  
                setGenCitation('')
              });          
          }           
         }}
        /><p/></div>
        <div><strong>Answer: </strong><p id="response">{spinner?"Generating an answer...":genResponse}</p></div>
        <div><strong>Citation: </strong><p id="citation">{spinner?"":genCitation}</p></div>
        <br/>
        <div><strong>History: </strong><p/></div>
          {history.slice(-15).map((item, index) => (
           <div>
              <div><strong>Q: </strong>{item.question}</div>
              <div><strong>A: </strong>{item.response}</div>
              <br/>
            </div>
          ))}
      </div>
    </div>          
  );
}

export default App;
