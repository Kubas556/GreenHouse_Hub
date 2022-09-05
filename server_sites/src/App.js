import React from "react";
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import login from "./Login.js";
import main from "./Main.js";

export default function App() {
    return(
        <BrowserRouter>
            <div>
                <Switch>
                    <Route path="/" component={main} exact/>
                    <Route path="/login" component={login} exact/>
                    <Route component={Error}/>
                </Switch>
            </div>
        </BrowserRouter>
    )
}