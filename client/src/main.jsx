import React, {useState} from "react";
import ReactDOM from "react-dom/client";
import {Route, Routes} from "react-router-dom";
import {BrowserRouter} from "react-router-dom";


const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(<BrowserRouter><Application /></BrowserRouter>);

function FrontPage() {
    const [counter, setCounter] = useState(0);

    return <>
        <h2>Welcome to my application</h2>
            <div>
                <button onClick={() => setCounter(oldValue => oldValue + 1)}>Click me</button>
            </div>
        <div>You have clicked {counter} times</div>
    </>
}

function Application() {
    return <Routes>
        <Route path={"/"} element={ <FrontPage/> }/>
        <Route path={"*"} element={<h1>Page not found</h1>}/>
    </Routes>;
}