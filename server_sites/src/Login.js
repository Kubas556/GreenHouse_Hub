import React from "react";

export default function login() {
    return(
        <div>
            <h1>Login page</h1>
            <form method="post">
                <label>
                    Email:
                    <input type="text" name="email"/>
                </label>
                <label>
                    Password:
                    <input type="password" name="password"/>
                </label>
                <input type="submit" value="Submit" />
            </form>
        </div>
    )
}