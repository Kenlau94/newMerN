/* eslint-disable no-unused-vars */

// Importing necessary dependencies and components from external libraries
import { useState, useEffect } from "react";
import { Container, Col, Form, Button, Card, Row } from "react-bootstrap";

// Importing utility functions and GraphQL queries/mutations
import Auth from "../utils/auth";
import { SAVE_BOOK } from "../utils/mutations";
import { useMutation } from "@apollo/client";
import { searchGoogleBooks } from "../utils/API";
import { saveBookIds, getSavedBookIds } from "../utils/localStorage";
import { GET_ME } from "../utils/queries";

// Functional component for the book search feature
const SearchBooks = () => {
  // State variables to manage data within the component
  const [searchedBooks, setSearchedBooks] = useState([]); // Holds Google API data
  const [searchInput, setSearchInput] = useState(""); // Holds search field data
  const [savedBookIds, setSavedBookIds] = useState(getSavedBookIds()); // Holds saved book IDs

  // GraphQL mutation hook to save a book
  const [saveBook, _] = useMutation(SAVE_BOOK, {
    refetchQueries: [{ query: GET_ME }],
    awaitRefetchQueries: true,
  });

  // set up useEffect hook to save `savedBookIds` list to localStorage on component unmount
  // learn more here: https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup
  useEffect(() => {
    return () => saveBookIds(savedBookIds);
  });

  // Method to handle form submission and initiate book search
  const handleFormSubmit = async (event) => {
    event.preventDefault();

    // Ensure search input is not empty
    if (!searchInput) {
      return false;
    }

    try {
      // Fetch book data from Google Books API
      const response = await searchGoogleBooks(searchInput);

      if (!response.ok) {
        throw new Error("something went wrong!");
      }

      const { items } = await response.json();

      // Process fetched data and update state
      const bookData = items.map((book) => ({
        bookId: book.id,
        authors: book.volumeInfo.authors || ["No author to display"],
        title: book.volumeInfo.title,
        description: book.volumeInfo.description,
        image: book.volumeInfo.imageLinks?.thumbnail || "",
      }));

      setSearchedBooks(bookData);
      setSearchInput("");
    } catch (err) {
      console.error(err);
    }
  };

  // Method to handle saving a book to the database
  const handleSaveBook = async (bookId) => {
    // Find the book in `searchedBooks` state by the matching id
    const bookToSave = searchedBooks.find((book) => book.bookId === bookId);

    // Get user token
    const token = Auth.loggedIn() ? Auth.getToken() : null;

    // Ensure token is available
    if (!token) {
      return false;
    }

    try {
      // Save book to the database
      const { data } = await saveBook({
        variables: { bookSaved: { ...bookToSave } },
      });

      // If book successfully saves, update the state with the new book ID
      setSavedBookIds([...savedBookIds, bookToSave.bookId]);
    } catch (err) {
      console.error(err);
    }
  };

  // JSX markup for rendering the search component
  return (
    <>
      <div className="text-light bg-dark p-5">
        <Container>
          <h1>Search for Books!</h1>

          <Form onSubmit={handleFormSubmit}>
            <Row>
              <Col xs={12} md={8}>
                <Form.Control
                  name="searchInput"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  type="text"
                  size="lg"
                  placeholder="Search for a book"
                />
              </Col>
              <Col xs={12} md={4}>
                <Button type="submit" variant="success" size="lg">
                  Submit Search
                </Button>
              </Col>
            </Row>
          </Form>
        </Container>
      </div>

      <Container>
        <h2 className="pt-5">
          {searchedBooks.length
            ? `Viewing ${searchedBooks.length} results:`
            : "Search for a book to begin"}
        </h2>
        <Row>
          {searchedBooks.map((book) => {
            return (
              <Col md="4" key={book.bookId}>
                <Card border="dark">
                  {book.image ? (
                    <Card.Img
                      src={book.image}
                      alt={`The cover for ${book.title}`}
                      variant="top"
                    />
                  ) : null}
                  <Card.Body>
                    <Card.Title>{book.title}</Card.Title>
                    <p className="small">Authors: {book.authors}</p>
                    <Card.Text>{book.description}</Card.Text>

                    {Auth.loggedIn() && (
                      <Button
                        disabled={savedBookIds?.some(
                          (savedBookId) => savedBookId === book.bookId
                        )}
                        className="btn-block btn-info"
                        onClick={() => handleSaveBook(book.bookId)}
                      >
                        {savedBookIds?.some(
                          (savedBookId) => savedBookId === book.bookId
                        )
                          ? "This book has already been saved!"
                          : "Save this Book!"}
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Container>
    </>
  );
};

// Export the SearchBooks component
export default SearchBooks;
