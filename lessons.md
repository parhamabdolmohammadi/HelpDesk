# Lessons

Log of prompts the user has flagged as important (marked with `imptp`) while
working through this project, organized by lesson and sub-lesson as the user
announces them.

<!--
Format:
## <Lesson Name>
### <Sub-lesson Name>
- <verbatim prompt text>
-->

## Authentication

### Sessions

4- Setting Up Better Auth

- set up better auth with email/password and use database sessions. bare minimum no ui ask me any clarifying questions

5- Reviewing Authentication Setup

- Start The Server and Test Auth flow
  
6- Registering Users

- Disable The Signup Endpoit

- Send a Curl REquest to make sure sign up is disabled

-create a seed script to populate the database with an admin user

7-building a login Page 

- build the login page. when the user logs in,
redirect them to the home page and show the
user's name in the nav bar along with a
sign out button.

- when i login i get an error invalid origin

8- Reviewing the login page

-in @../server/src/lib/auth.ts, replace the
hardcoded trustedorigin with an environment
@../server/src/lib/auth.ts

9- Implemeinting Validation

-Use React Hook Form With zod

- If a field is invalid show a red border around that field

10- Adding Tailwind

- install tailwind and use it on all pages

- Remove All custom css code and replace it with tailwind css and make sure its exaclty as it was before

11- Installing shadcn

- install shadcn and use defalt theme

- now lets build the login page using shadcn components

- change the color of the navbar to white

- Update the project memory

- add necessary details about athentication in claude.md

12. Implementing Role Based Access

- create a page at /users with just a heading. make it accessible only to admins

- add a link to the users page in nav for admins

- create an agent user
  email: agent@example.com password: password123


13. Creating a security Audit Agent  

-(create an agent add it to this project and generate it with claude

Description:
Review the codebase for
security vulnerabilities

-have access to all tools

- use the same model

- color: yellow

- name : security reviewer

Description:

Use this agent when the user asks to review the codebase for security
vulnerabilities, audit security practices, check for common security
issues, or assess the overall security posture of the application.
This includes requests to find insecure code, authentication and
authorization issues, data exposure, injection vulnerabilities,
misconfigurations, insecure dependencies, or other potential security
risks.

System prompt:

You are an elite application security engineer with 15+ years of
experience in penetration testing, secure code review, and vulnerability
assessment. You specialize in full-stack web application security with
deep expertise in Node.js/Express, React, TypeScript, authentication,
session management, PostgreSQL, Prisma, REST APIs, and common web
security vulnerabilities.)



- use security-reviewer agent to review my code, specifically focusing on authentication and authorization.

- use helmet and corst for trusted origins if you havent also apply ratelimiter for authentication



16- Setting Up PlayWright

- Set Up PlayWright with seperate database for testing dont write any testsjust do the setup and configuration.

-The seed script for admin user is not executed(for course not me)

- enable only rate limiting in production environment

- update project memory

18 - Creating a testing agent

  (- Create a n agent and add it to this project and generate it with claude

    Description:
    Write E2E Tests Using PlayWright

    -have access to all tools

    -use the same model

    -color: Purple

    -name: e2e test writer

    move the testing instructions from claude.md to e2e-test-writer)

  - update claude.md add instructions for using e2e-test-writer for writing tests

19- Writing And Running E2E Tests

- write e2e tests for authentication cover all edge cases using e2e-test-writer agent that weve created



## User List Feature

### Sessions

2- Listing Users

- Build the user List feature. build both the frontend and backend. This feature should be only accessible to admin

3 - Using React query 

- Replace fetch with axios

- Use Tanktack query

-add an instrution to claude.md to use axios and react query

4 - Using Loading Skeletons

- replace the loading message with loading skeletons

- add a link to homepage on the app name in navbar

5 - writing Unit teste

- write component tests for the user list page using react library.

- update claude.md and add instructions for writing and executing component tests
  
- run all component tests

-add a command to client package.json to run component tests

- add the ability to create new users.

6 - Creating Users

(-add a button above the user list for creating
new users. when clicked, show a modal with 3
input fields: name, email and password.
Ensure the form is valid:

name: min 3 chars
password: min 8 chars

when the form is submitted, create the user
in the database and hide the modal.)

7 - Reviewing the backend

- use zod for data validation mention that in claude.md

-  Try catch in express in unnecessary because it can automaticlly candle rejected promise clean the code and mention in claude.md

-(where role is defined when creating user?

  and if you havent used enum for user role creating make sure you do it mention it in claude.md

  also all user related endpoints should be refactored)  

8 - Reviewing The frontend

- CreateUserschema already exists on the server extract that into a separate module in both client and server. update claude.md and add an instruction for defining zod schemas in the core package and referencing them in both client and server.

- create a users table component and refactor from users page

9 - Testing Creating Users

- write unit tests for the userspage to make sure that when the button is clicked the dialog
is shown. and that it gets hidden when we click outside or press esc.

- write unit tests for create user form

10 - Editing Users

- add the ability to edit users.

in the users table, add a edit button  with an icon to each row. when clicked, show the user form in a dialog box populated with users data. if the password is provided use it to change user's password. otherwise dont change the password.

13- deleting users

- Add the ability to delete users. show a modal for confirmation. admin cannot be deleted. implement soft deletion. if a user is soft deleted their session is invalidated so theypre logged out right away

15 - e2e tests

- write e2e tests for the user management. focus only on happy paths. include tests for all  crud operations.
  
- run e2e tests

- run unit tests


## Authentication

### Sessions

2 - Receiving Tickets

-Add the ability to receive an email at a support address and convert it to a ticket (plan mode)

5 - Listing Tickets

- build the ticket list feature sort tickets by newest first.

7 - sorting tickets

- add sorting to tickets table using tanstack table. sorting should happen on the server SOTING SHOULD HAPPEN ON THE SERVER.   YOUR BIGGEST iSSUE

- create 100 tickets using real - life example so we can see sorting and filtering

8 - filtering Tickets

- add filtering

9 - Add Pagination

- add pagination

10 - Viewing Ticket Details

- on the ticket list, when we click on the subject of a ticket, we should see the ticket details in a separate page

11 - Assigning Tickets

- add the ability to assign tickets to an agent
  

12 - Updating Tickets

- add the ability to update ticket status and category

- split the ticket detail page into 2 columns put all drop down lists in the right column

13 - Add the ability to reply to tickets

- add the ability to reply to tickets on the ticket detail page show the reply thread below the message and add a form to submit new replies

-add a sender type to distinguish from sender and admin type


## Authentication

### AI Powered  Features


2 - Polishing Replies

- on ticket details page, add a polish button before send reply when clicked, improve the agent's reply using gpt-5-nano. use ai sdk by vercel

- Sign the polished reply with agent's name and email

- also address the customer by their name

- Instead of validation error disable the send reply button if the there is no message

4 - Testing AI Features

- Write Unit test for this features

5 - Summarizing Tickets

- add the ability to summarize a ticket add a summarize button with sparkles icon below the message and re-generate the summary each time
  
7- Classifying tickets

- automatically classify tickets using gpt. do it in a non-blocking fashion

- create a new ticket hitting /inbound-email endpoint to create a new ticket asking question about postgres

- Create a Ticket asking how to get a refund for a course

- create a new ticket how to change password

9- background job processing

- use pg-boss for classifying tickets

- hit the webhook to create a new ticket asking a general question

10 - Auto Resolving Tickets

- Add the ability to auto resolve tickets upon arrival using a knowledge base file @knowledge-base.md

don't show tickets being resolved by ai on the list

- create a ticket via the webhook that can be answered from the knowledge base

- When creating a reply, address the customer by first name. sign the email with Parham Abdo Support and make sure the reply has a professional and custumer friendly tone and properly formatted

- Now create another ticket that the response is not in knowledge base

