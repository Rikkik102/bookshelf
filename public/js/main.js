$(document).ready(function() {
  // Form validation for contact form
  $('#contactForm').on('submit', function(e) {
    e.preventDefault();
   
    const name = $('#name').val().trim();
    const email = $('#email').val().trim();
    const message = $('#message').val().trim();
   
    if (!name || !email || !message) {
      showAlert('Please fill out all fields.', 'danger');
      return false;
    }
   
    // AJAX form submission
    $.ajax({
      url: '/contact',
      type: 'POST',
      data: $(this).serialize(),
      success: function(response) {
        // Clear the form
        $('#contactForm')[0].reset();
       
        // Show success message
        showAlert('Thanks for your message! We\'ll get back to you soon.', 'success');
      },
      error: function(xhr) {
        showAlert(xhr.responseText || 'Error sending message. Please try again.', 'danger');
      }
    });
   
    // Return false to ensure form doesn't submit
    return false;
  });
 
  // Form validation for login
  $('#loginForm').on('submit', function(e) {
    const email = $('#email').val().trim();
    const password = $('#password').val().trim();
   
    if (!email || !password) {
      e.preventDefault();
      showAlert('Please enter both email and password.', 'danger');
      return false;
    }
   
  });
 
  // Form validation for registration
  $('#registerForm').on('submit', function(e) {
    const username = $('#username').val().trim();
    const email = $('#email').val().trim();
    const password = $('#password').val().trim();
   
    if (!username || !email || !password) {
      e.preventDefault();
      showAlert('Please fill out all fields.', 'danger');
      return false;
    }
   
    if (username.length < 3) {
      e.preventDefault();
      showAlert('Username must be at least 3 characters long.', 'danger');
      return false;
    }
   
    if (password.length < 6) {
      e.preventDefault();
      showAlert('Password must be at least 6 characters long.', 'danger');
      return false;
    }
  });
 
  // Book carousel initialization if it exists
  if ($('.book-carousel').length) {
    $('.book-carousel').carousel({
      interval: 5000
    });
  }
 
  $(document).on('click', '.delete-book-btn', function(e) {
    e.preventDefault();
    const bookId = $(this).data('book-id');
    const bookTitle = $(this).data('book-title');
    const bookCard = $(this).closest('.col-md-4');
   
    if (confirm('Are you sure you want to delete "' + bookTitle + '" from your bookshelf?')) {
      // Send delete request using POST instead of DELETE
      $.ajax({
        url: '/books/delete/' + bookId,
        type: 'POST', 
        success: function(response) {
          // Remove the book card from UI
          bookCard.fadeOut(function() {
            $(this).remove();
            showAlert('Book removed from your bookshelf.', 'success');
           
            // Check if we need to show the empty bookshelf message
            if ($('.card').length === 0) {
              $('.row:has(.col-md-4)').html('<div class="alert alert-info"><p>You haven\'t added any books yet. Try searching for books above!</p></div>');
            }
           
            // If we're on a status page and no books left with this status
            if ($('.status-badge').length === 0 && (window.location.pathname.includes('/read') ||
                window.location.pathname.includes('/unread') ||
                window.location.pathname.includes('/in-progress'))) {
              $('.row:has(.col-md-4)').after('<div class="alert alert-info"><p>No books marked with this status yet.</p></div>');
            }
          });
        },
        error: function(xhr) {
          console.error('Error deleting book:', xhr.responseText);
          showAlert(xhr.responseJSON?.error || 'Error deleting book. Please try again.', 'danger');
        }
      });
    }
  });
 
  // Update book status via AJAX
  $(document).on('submit', '.update-status-form', function(e) {
    e.preventDefault();
    const form = $(this);
    const bookCard = form.closest('.col-md-4');
    const newStatus = form.find('select').val();
    const currentPath = window.location.pathname;
   
    $.ajax({
      url: form.attr('action'),
      type: 'POST',
      data: form.serialize(),
      success: function(response) {
        // Update the displayed status badge
        const statusBadge = form.closest('.card-body').find('.status-badge');
        statusBadge.text(newStatus);
       
        // Update the status badge class
        statusBadge.removeClass('status-unread status-progress status-read');
        if (newStatus === 'Unread') {
          statusBadge.addClass('status-unread');
        } else if (newStatus === 'In Progress') {
          statusBadge.addClass('status-progress');
        } else {
          statusBadge.addClass('status-read');
        }
       
        // If we're on a status page and the new status doesn't match the page, remove the card
        if ((currentPath === '/read' && newStatus !== 'Read') ||
            (currentPath === '/unread' && newStatus !== 'Unread') ||
            (currentPath === '/in-progress' && newStatus !== 'In Progress')) {
         
          bookCard.fadeOut(function() {
            $(this).remove();
           
            // If no books left with this status, show the "no books" message
            if ($('.card').length === 0) {
              let statusText = '';
              if (currentPath === '/read') statusText = 'Read';
              else if (currentPath === '/unread') statusText = 'Unread';
              else if (currentPath === '/in-progress') statusText = 'In Progress';
             
              $('.row').html('<div class="alert alert-info"><p>No books marked as ' + statusText + ' yet.</p></div>');
            }
           
            showAlert('Book status updated to ' + newStatus + '. Removed from current view.', 'success');
          });
        } else {
          // Show regular success message
          showAlert('Book status updated to ' + newStatus + '.', 'success');
        }
      },
      error: function(xhr) {
        console.error('Error updating status:', xhr.responseText);
        showAlert(xhr.responseJSON?.error || 'Error updating status. Please try again.', 'danger');
      }
    });
  });
 
  // Utility function to show alert messages
  function showAlert(message, type) {
    // Remove any existing alerts
    $('.alert-dismissible').remove();
   
    // Create new alert
    const alert = $('<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
                    message +
                    '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                    '</div>');
   
    // Insert alert at the top of the container
    $('.container').first().prepend(alert);
   
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
      alert.alert('close');
    }, 5000);
  }
});

