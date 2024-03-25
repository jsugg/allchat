import React from "react";
import { render, fireEvent, waitFor, screen, act } from "@testing-library/react";
import App from "../../App";
import "@testing-library/jest-dom";

global.fetch = jest.fn();

describe("App Component", () => {
    afterEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it("renders without crashing", () => {
        render(<App />);
    });

    it("should generate chat summary when selecting a history item", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve({ textResponse: "Test summary" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        // Add some chat history
        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Hello" } });
        fireEvent.click(submitButton);

        fireEvent.change(inputField, { target: { value: "How are you?" } });
        fireEvent.click(submitButton);

        // Open the SideDrawer
        const drawerToggleButton = screen.getByRole("button", { name: "open drawer" });
        fireEvent.click(drawerToggleButton);

        // Select the first history item
        const historyItem = await screen.findByText(/Hello/i);
        fireEvent.click(historyItem);

        // Check if the chat summary is generated correctly
        const chatSummary = await screen.findByText("Test summary");
        expect(chatSummary).toBeInTheDocument();
    });

    it("should send file and query to API", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve({ textResponse: "Test response" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });
        const fileInput = screen.getByTestId("file-input");
        const file = new File(["(⌐□_□)"], "test.png", { type: "image/png" });

        fireEvent.change(fileInput, { target: { files: [file] } });
        fireEvent.change(inputField, { target: { value: "Test query" } });

        // Wrap the state update with act
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        const fetchOptions = global.fetch.mock.calls[0][1];
        expect(fetchOptions.method).toBe("POST");
        expect(fetchOptions.headers).toHaveProperty("Authorization");
        expect(JSON.parse(fetchOptions.body)).toHaveProperty("input", "Test query");
    });

    it("should handle failed API response", async () => {
        const mockResponse = { ok: false, status: 500 };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Test query" } });
        fireEvent.click(submitButton);

        await waitFor(() => expect(screen.getByText("Failed response from the server.")).toBeInTheDocument());
    });

    it("opens authentication modal when authentication button is clicked", async () => {
        const { getByText, getByRole } = render(<App />);
        const authButton = getByText("Sign In");

        fireEvent.click(authButton);

        await waitFor(() => {
            expect(getByRole("heading", "Login")).toBeInTheDocument();
        });
    });

    it("closes authentication modal when cancel button is clicked", async () => {
        const { getByText, getByRole } = render(<App />);
        const authButton = getByText("Sign In");
        fireEvent.click(authButton);
        await waitFor(() => {
            expect(getByRole("heading", "Login")).toBeInTheDocument();
        });
        const cancelButton = getByText("Cancel");
        fireEvent.click(cancelButton);
        await waitFor(() => {
            expect(screen.queryByText("Login")).not.toBeInTheDocument();
        });
    });

    it("handles file selection correctly", async () => {
        const { getByTestId } = render(<App />);
        const fileInput = getByTestId("file-input");

        const file = new File(["(⌐□_□)"], "test.png", { type: "image/png" });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(fileInput.files[0]).toEqual(file);
        });
    });

    it("submits input correctly", async () => {
        const { getByText } = render(<App />);
        const inputField = screen.getByLabelText("Enter your question");
        const submitButton = getByText("Send");

        fireEvent.change(inputField, { target: { value: "Test message" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(inputField.value).toBe("");
        });
    });

    it("should handle authentication failure on API response", async () => {
        const mockResponse = { ok: false, status: 403 };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Test query" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => expect(screen.getByText("Authentication failed.")).toBeInTheDocument());
        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("userEmail")).toBeNull();
    });

    it("should handle failed API response with 500 error", async () => {
        const mockResponse = { ok: false, status: 500 };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Test query" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => expect(screen.getAllByText("Failed response from the server.")[0]).toBeInTheDocument());
    });

    it("should handle network error when sending API request", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Network error"));

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Test query" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => expect(screen.getByText("Failed to connect to the server.")).toBeInTheDocument());
    });

    it("should clear all chat history", async () => {
        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        // Add some chat history
        fireEvent.change(inputField, { target: { value: "Hello" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });
        fireEvent.change(inputField, { target: { value: "How are you?" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });
        // Open the SideDrawer
        const drawerToggleButton = screen.getByRole("button", { name: "open drawer" });
        await act(async () => {
            fireEvent.click(drawerToggleButton);
        });
        // Clear all chat history
        const clearHistoryButton = screen.getByRole("button", { name: "Clear All" });
        await act(async () => {
            fireEvent.click(clearHistoryButton);
        });
        expect(localStorage.getItem("chatHistory")).toBeNull();
        expect(localStorage.getItem("storedChatHistories")).toBeNull();
        expect(screen.queryByText("Hello")).not.toBeInTheDocument();
        expect(screen.queryByText("How are you?")).not.toBeInTheDocument();
    });

    it("should handle new chat", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve({ textResponse: "Test summary" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        // Add some chat history
        fireEvent.change(inputField, { target: { value: "Hello" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Open the SideDrawer
        const drawerToggleButton = screen.getByRole("button", { name: "open drawer" });
        await act(async () => {
            fireEvent.click(drawerToggleButton);
        });

        // Start a new chat
        const newChatButton = screen.getByRole("button", { name: "New Chat" });
        await act(async () => {
            fireEvent.click(newChatButton);
        });
        expect(localStorage.getItem("chatHistory")).toBeNull();
        expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    });

    it("should handle history selection", async () => {
        const mockResponse = { ok: false, json: () => Promise.resolve({ textResponse: "Test summary" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        // Add some chat history
        fireEvent.change(inputField, { target: { value: "Hello" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        fireEvent.change(inputField, { target: { value: "How are you?" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Open the SideDrawer
        let drawerToggleButton = screen.getByRole("button", { name: "open drawer" });
        await act(async () => {
            fireEvent.click(drawerToggleButton);
        });

        // Start a new chat
        const newChatButton = screen.getByRole("button", { name: "New Chat" });
        await act(async () => {
            fireEvent.click(newChatButton);
        });

        // Open the SideDrawer
        drawerToggleButton = screen.getByRole("button", { name: "open drawer" });
        await act(async () => {
            fireEvent.click(drawerToggleButton);
        });

        // Select the first history item
        const historyItem = (await screen.findAllByRole("button", "Test summary"))[1];
        await act(async () => {
            fireEvent.click(historyItem);
        });

        await waitFor(() => expect(screen.getByText("How are you?")).toBeInTheDocument());
    });
});

describe("Authentication and Sign-out", () => {
    afterEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it("should sign in successfully", async () => {
        const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ token: "123" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        const { getByText, getByLabelText, getByRole } = render(<App />);
        const authButton = getByText("Sign In");
        await act(async () => {
            fireEvent.click(authButton);
        });

        const emailInput = getByLabelText("Email");
        const passwordInput = getByLabelText("Password");
        const loginButton = getByRole("button", { name: "Login" });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });
        await act(async () => {
            fireEvent.click(loginButton);
        });
        await waitFor(() => {
            expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
            expect(localStorage.getItem("token")).toBeTruthy();
            expect(localStorage.getItem("userEmail")).toBe("test@example.com");
        });
    });

    it("should sign out successfully", async () => {
        const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ token: "123" }) };
        global.fetch.mockResolvedValueOnce(mockResponse);

        const { getByText, getByLabelText, getByRole } = render(<App />);

        // Click on the "Sign In" button to open the authentication modal
        const signInButton = getByText("Sign In");
        fireEvent.click(signInButton);

        // Wait for the authentication modal to open
        const loginHeading = await waitFor(() => getByRole("heading", { name: "Login" }));
        expect(loginHeading).toBeInTheDocument();

        // Fill in the email and password fields
        const emailInput = getByLabelText("Email");
        const passwordInput = getByLabelText("Password");
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        // Submit the authentication form
        const loginButton = getByRole("button", { name: "Login" });
        await act(async () => {
            fireEvent.click(loginButton);
        });

        // Wait for the authentication process to complete and the modal to close
        await waitFor(() => expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument());

        const avatar = screen.getByTestId("profile");

        // Click on the avatar to open the dropdown menu
        await act(async () => {
            fireEvent.click(avatar);
        });

        // Click on the "Sign Out" button
        const signOutButton = getByText("Sign Out");
        await act(async () => {
            fireEvent.click(signOutButton);
        });

        // Verify that the token and user email are removed from local storage
        await waitFor(() => {
            expect(localStorage.getItem("token")).toBeNull();
            expect(localStorage.getItem("userEmail")).toBeNull();
        });
    });

    it("should display sign-in modal when authentication fails", async () => {
        const mockResponse = { ok: false, status: 403 };
        global.fetch.mockResolvedValueOnce(mockResponse);

        render(<App />);

        const inputField = screen.getByRole("textbox");
        const submitButton = screen.getByRole("button", { name: "Send" });

        fireEvent.change(inputField, { target: { value: "Test query" } });
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => expect(screen.getByRole("heading", "Login")).toBeInTheDocument());
    });
});
