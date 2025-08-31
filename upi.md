# UPI Payment Simulation & Testing Platform – Project Requirements Document (PRD)

## 1. Project Overview
This project is a **web-based UPI payment simulator**, designed for software testing assignments. It aims to implement the core functionalities of a UPI system in a simplified environment, enabling comprehensive testing and demonstration of functional, security, performance, and compliance test cases.

## 2. Objectives
- Build a functioning UPI-like payment application for simulated transactions.
- Allow creation, execution, and verification of all key test cases relevant for UPI systems.
- Support test automation and manual testing with logs and reporting features.

## 3. Key Features and Functionalities

### User Features
- User registration and login (PIN/OTP, mock biometric support)
- Manage multiple virtual UPI IDs and link bank accounts
- P2P (Person-to-Person) and P2M (Person-to-Merchant) simulated payments (QR code support)
- View and download transaction history
- Notification system for transaction statuses

### System Features
- Simulated backend with REST APIs (Node.js, Python, or Java)
- In-memory or simple database (SQLite, JSON, or MongoDB)
- Test data generator for user, bank, and transaction records
- Realistic constraints: authentication, PIN retry, session timeout, encryption mock, concurrency controls

### Admin/Test Controls
- View, re-run, and export test logs and payment attempts
- Inject errors (failure modes, latency, session drop, etc.)
- Test mode: simulate peak loads, boundary values, compliance checks
- Utilities for masking data and validating audit logs

## 4. Test Case Support

This project will allow demonstration and verification of the following representative test cases:

| TC ID  | Scenario                                | Input                          | Expected Result                  | Test Type    |
|--------|-----------------------------------------|--------------------------------|----------------------------------|-------------|
| TC01   | UPI PIN Validation                      | Correct/incorrect PIN          | Success/Error (lockout on retry) | Functional  |
| TC04   | Invalid UPI ID Format                   | Invalid UPI ID like user@xyz#  | Format validation error          | Functional  |
| TC05   | Transaction Amount - Min Boundary       | Min ₹0.01                      | Success                          | BVA         |
| TC06   | Transaction Amount - Max Boundary       | Max ₹1,00,000                  | Success/Limit Error              | BVA         |
| TC09   | P2M QR Payment                          | Merchant QR                    | Success/Fail                     | Functional  |
| TC11   | Session Timeout                         | Idle > 5 min                   | Session expires                  | Security    |
| TC13   | SQL Injection Test                      | Input malicious SQL            | Input is sanitized, no breach    | Security    |
| TC14   | Device Binding                          | Login from new device          | OTP required                     | Security    |
| TC15   | Response Time Under Load                | 50k concurrent users           | <2 sec response                  | Performance |
| TC19   | Transaction Reversal                    | Pay to invalid UPI ID          | Amount refunded, notified        | Functional  |
| TC21   | Compliance Rule Enforcement             | Transfer > ₹2,00,000           | Transfer blocked                 | Compliance  |
| …      | And other test cases from your list     |                                |                                  |             |

*(You can expand with all test cases from your slides for completeness.)*

## 5. Non-Functional Requirements

- Web UI must be simple and mobile-friendly.
- Simulate at least 10,000 transactions in performance/load mode.
- Security: all sensitive data masked in logs; simulate encryption at transmission.
- All API endpoints return clear, auditable responses.
- Must be easy to clean/reset database for repeated testing.

## 6. Architecture & Tech Stack

- **Frontend:** Basic HTML/JS, Bootstrap
- **Backend:** Express (Node.js)
- **Database:** JSON
- **Testing:** Manual test docs + sample automation scripts (/Postman/pytest/Jest)

## 7. How to Run & Test

1. Clone/download the project locally.
2. Set up backend: `python app.py` or `node app.js` or as per stack.
3. Launch frontend on `localhost`.
4. Use the test data generator or manual entry.
5. Execute test cases and capture logs.
6. Cross-check expected and actual results for each scenario.
7. Document findings for assignment submission.
---
**End of PRD**