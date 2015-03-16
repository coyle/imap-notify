# imap-notify

> Small library that listens for incoming messages on the imap server and returns the parsed message

## Installation
```javascript
npm install imap-notify
```
## Examples
```javascript
var 
  notify = require('imap-notify'),
  options,
  notifier;

options = {
  user: 'username@domain.com',
  password: 'myPassword',
  host: 'imap.host.name',
  port: 993,
  tls: true,
  box: 'Inbox'
};

notifer = notify(options);

notifier.on('error', function(err) {
  console.log(err);
});

notifier.on('mail', function(msg) {
  console.log(msg);
});

notifier.on('success', function() {
  console.log('connection made');
});

notifier.on('close', function() {
  console.log('connection closed');
});
```

## Connection Options
+ **user** - string - Username for plain-text authentication.
+ **password** - string - Password for plain-text authentication.
+ **xoauth2** - string - Base64-encoded OAuth2 token for The SASL XOAUTH2 Mechanism for servers that support it (See Andris Reinman's xoauth2 module to help generate this string).
+ **host** - string - Hostname or IP address of the IMAP server. **Default:** 'localhost
+ **port** - integer - Port number of the IMAP server. **Default:** 143
+ **tls** - boolean - Perform implicit TLS connection? **Default:** false
+ **box** - string - The box to listen on for new messages. **Default:**'Inbox'


## Events
+ **mail**(\<Object> message) - Emitted when a new message is received with the new Parsed email message
+ **error**(\<String> error) - Emitted when an error occurs between the library and the imap server
+ **close**() - Emitted on connection closure
+ **success**() - Emittied when connection succeeds

## Mail Object
* **headers** - unprocessed headers in the form of - ``` {key: value}``` - if there were multiple fields with the same key then the value is an array
* **from** - an array of parsed ```From``` addresses - ``` [{address:'sender@example.com',name:'Sender Name'}] ``` (should be only one though)
* **to** - an array of parsed ```To``` addresses
* **cc** - an array of parsed ```CC``` addresses
* **bcc** - an array of parsed ```Bcc``` addresses
* **subject** - the subject line
* **references** - an array of reference message id values (not set if no reference values present)
* **inReplyTo** - an array of In-Reply-To message id values (not set if no in-reply-to values present)
* **priority** - priority of the e-mail, always one of the following: normal (default), high, low
* **text** - text body
* **html** - html body
* **date** - date field as a ```Date()``` object. If date could not be resolved or is not found this field is not set. Check the original date string from ```headers.date```
* **attributes** -  Object containing meta information about message  
  * **uid** - integer - A 32-bit ID that uniquely identifies this message within its mailbox.  
  * **flags** - array - A list of flags currently set on this message.   
  * **date** - Date - The internal server date for the message.  
  * **struct** - array - The message's body structure (only set if requested with fetch()). See below for an explanation of the format of this property.  
  * **size** - integer - The RFC822 message size (only set if requested with fetch()).  
