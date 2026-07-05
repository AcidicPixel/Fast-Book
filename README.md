# Introductory Guide

Welcome to the codebase! This document is designed to help you understand how this application is wired together, where to find things, how to fix them when they break, and how to effectively use AI to speed up your development.

This app is built using a **Microservice Architecture** orchestrated by **.NET Aspire**. While there is some advanced plumbing under the hood (like an API Gateway and an Event Bus/DB setup), I've set these up in a way you don't need to think about them, of course give me an ask if you do want to know anything

Your main playground consists of two areas: The **React Frontend** and the **C# Trip Service**.


TO RUN THE CODE, YOU CLICK THE .SLNX FILE, MAKE SURE APPHOST IS THE STARTUP PROJECT NEXT TO THE GREEN ARROW AND PRESS GO! :))
When you get on the dashboard, click the link to the front end :)

---

## 1. How the Code is Structured

### The Backend (`/src/TripService`)
This is our data engine. It receives requests from the frontend, talks to the database, and sends data back. We use a pattern called the "Repository Pattern" to keep things organized.

* **`Models/Trip.cs`**: The blueprint. This defines exactly what a "Trip" looks like in the database (columns like Name, Price, Date).
* **`DTO/` (Data Transfer Objects)**: We don't want to send the *entire* database row to the frontend (this can cause security issues). DTOs are lightweight versions of our models shaped specifically for the UI.
* **`Profiles/ServiceProfile.cs`**: Uses a tool called AutoMapper to automatically translate our heavy Database Models into our lightweight DTOs.
* **`Data/TripDbContext.cs`**: The bridge to Postgres. This translates our C# code into SQL (database) commands.
* **`Data/TripServiceRepo.cs`**: The actual database worker. This is where we write the logic to Get, Create, and Delete trips.
* **`Controllers/TripController.cs`**: The front door to the API. This intercepts network requests from the frontend, asks the Repo for the data, and returns it as JSON (A structured file type).

### The Frontend (`/src/FrontEnd`)
This is a React application built with Vite and TypeScript. We have specifically structured it so that API calls are completely separated from the UI logic.

* **`src/api/DtoTypes.ts`**: The TypeScript contracts. This mirrors the C# DTOs so our frontend knows exactly what data to expect.
* **`src/api/HttpClient.ts`**: A wrapper around the standard browser `fetch` command. We handle all our headers and error-checking here so we don't have to repeat it.
* **`src/api/useApi.ts`**: A custom React Hook. Network requests have three states: *Loading*, *Error*, and *Data*. This hook manages those states automatically so our UI components stay perfectly clean.
* **`src/api/services/tripService.ts`**: Our catalogue of endpoints. We define the URLs here.
* **`src/App.tsx`**: The main dashboard page where we tie the API data to the actual HTML/CSS on the screen.

---

## 2. Debugging 101

Things *will* break. This is life, but you'll find that things more break and can be fixed much easier that bubble and the fixes you run into will be for "bigger" steps rather than messing around with just a calendar

### The .NET Aspire Dashboard (Your Best Friend)
When you run the AppHost (always make sure you do this when you press run (you can accidentally run the trip service or gateway :)), a dashboard opens in your browser. This is your command center.

* **Resources Tab:** Shows you every piece of the puzzle (Database, API, Frontend). If something has a red exclamation mark, it crashed on startup. Click "View" under Endpoints to see connection strings or open Swagger.

Swagger can be opened via clicking a resource (trip service) on the aspire dashboard and appending "/swagger" to the URL, it shows you a clear overview of the endpoints, what the inputs should be and what they output.

* **Console Logs Tab:** Click on `tripservice` here. If your C# code crashes, the exact line number and error message will be printed here.
* **Traces Tab:** Shows you the exact path a request took. You can see how long the Gateway took to route it, how long the Database took to query it, and where it failed.

### Visual Studio Breakpoints
If the code is running but doing the wrong thing, use a breakpoint.
1. Click the gray margin to the left of the line numbers in your C# code (a red dot will appear).
2. Trigger the action in your browser.
3. Visual Studio will pause time exactly on that line. You can hover your mouse over variables to see what data they hold in real-time.

### Browser Developer Tools (F12)
If the frontend isn't showing data, press F12 in your browser and go to the **Network** tab.
* Look for the request marked in red.
* **400 Bad Request:** You sent bad data (e.g., missed a required field).
* **404 Not Found:** The URL is wrong, or the backend Controller route doesn't match.
* **500 Internal Server Error:** Your C# backend crashed. Check the Aspire Console Logs!
* **502 Bad Gateway:** The API Gateway is alive, but the backend service is offline or unreachable.

---

## 3. The AI Workflow: How to Code with an LLM

Using AI isn't about asking it to "build an app" and walking away. It is a highly interactive, conversational process. Treat the AI like a senior developer sitting next to you. Here is the exact workflow to get the best results:

**1. Provide the Error First**
If something crashes, don't just say "it broke." Copy and paste the *entire* stack trace or error message directly into the chat. AI can read those cryptic logs instantly.
> *"I'm getting this error: `System.InvalidOperationException: The ConnectionString property has not been initialized.`"*

**2. Provide the Context (The Code)**
The AI cannot see your screen. Whenever you ask a question or share an error, paste the relevant file or code block that is causing the issue.
> *"Here is the `Program.cs` file where the error is happening: [paste code]"*

**3. State Your Intent**
Explain what you were *trying* to do when the error happened, or what you want the code to do next.
> *"I was trying to run `update-database` in the console so I could see my dummy trips."*

**4. Iterate Step-by-Step**
Don't try to build the entire app in one prompt. Build the Database model first. Once that works, ask it to help build the Controller. Once that works, ask it to help write the React component.

**5. Ask "Why?"**
If the AI gives you a fix and it works, but you don't understand *why* it worked, ask! 
> *"That fixed the 502 Bad Gateway error, but why did changing the hyphen in the vite.config.ts make a difference?"*

Love you xx
