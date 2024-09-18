import React from 'react';

interface EventDetails {
  title?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  location?: string;
  descriptions?: string;
}

interface EventConfirmationProps {
  eventDetails: EventDetails;
  onConfirm: () => void;
  onCancel: () => void;
}

const EventConfirmation: React.FC<EventConfirmationProps> = ({ eventDetails, onConfirm, onCancel }) => {
  const formatDateTime = (dateTime: { date?: string; dateTime?: string } | undefined) => {
    if (!dateTime) return 'Not specified';
    if (dateTime.date) {
      const date = new Date(dateTime.date + 'T00:00:00-05:00'); // Assuming America/New_York timezone
      return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } else if (dateTime.dateTime) {
      const date = new Date(dateTime.dateTime);
      return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return 'Not specified';
  };

  return (
    <div className="event-confirmation">
      <h2 className="confirmation-title">Confirm Event Details</h2>
      <div className="confirmation-details">
        <p><strong>Title:</strong> {eventDetails.title}</p>
        <p><strong>Start:</strong> {formatDateTime(eventDetails.start)}</p>
        <p><strong>End:</strong> {formatDateTime(eventDetails.end)}</p>
        {eventDetails.location && <p><strong>Location:</strong> {eventDetails.location}</p>}
        {eventDetails.descriptions && <p><strong>Description:</strong> {eventDetails.descriptions}</p>}
      </div>
      <div className="confirmation-buttons">
        <button className="confirm-button" onClick={onConfirm}>Confirm</button>
        <button className="cancel-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default EventConfirmation;
