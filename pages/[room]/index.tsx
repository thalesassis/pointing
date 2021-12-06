import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import _ from 'lodash';
import socketContext from '../../context/socketContext';
import { FaEdit, FaUser, FaLongArrowAltRight } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineLink, AiOutlineCloseCircle, AiOutlineCheck, AiOutlinePlus } from 'react-icons/ai';
import { VscDebugRestart } from 'react-icons/vsc';
import { BiDoorOpen, BiSad, BiSearchAlt } from 'react-icons/bi';
import { RiCloseCircleFill } from 'react-icons/ri';
import { usePageVisibility } from 'react-page-visibility';
import ReactMarkdown from 'react-markdown';
import Switch from "react-switch";
import Cookies from 'js-cookie';
import Creatable from 'react-select/creatable';
import Checkbox from "react-custom-checkbox";

const Room = (props) => {

  const topics = [
    {
      label: "UX", 
      options: [
        { label: "Do we need a mock for this?" },
        { label: "How will this look in mobile breakpoints?" },
        { label: "Do we have the icons added in Icomoon?" }
      ]
    }, {
      label: "Front-end / Back-end", 
      options: [
        { label: "Will this require both front and back-end?" },
        { label: "Does this apply for PHP/AngularJS pages?" },
        { label: "Will this require a new library?" },
        { label: "Do we have a component for this?" },
        { label: "Do we have class styles for this?" },
        { label: "Do we an example anywhere?" },
        { label: "What API should be used?" },
        { label: "Which system settings may affect this story?" },
        { label: "Should this be implemented on Syng?" }
      ]
    },
    {
      label: "Accessibility",
      options: [
        { label: "How will accessibility behave in this case?" },
        { label: "How should we label elements for screen readers?" }
      ]
    },
    {
      label: "Testing",
      options: [
        { label: "Will this require both QA and UX review?" },
        { label: "Should we re-test any other part of the system?" }
      ]
    },
    {
      label: "Story",
      options: [
        { label: "Is this release when ready?" },
        { label: "Is this for law version only?" },
        { label: "Does this story depend on another?" }
      ]
    }
  ];

  const socket = useContext(socketContext);
  const [userNameInput, setUserNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userList, setUserList] = useState({});
  const [newUserList, setNewUserList] = useState({});
  const [pointList, setPointList] = useState({});
  const [topicList, setTopicList] = useState([]);
  const [topicSelect, setTopicSelect] = useState(null);
  const [newTopic, setNewTopic] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [removeTopic, setRemoveTopic] = useState(null);
  const [topicDiscussed, setTopicDiscussed] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [recoverVote, setRecoverVote] = useState(null);
  const [revealVotes, setRevealVotes] = useState(false);
  const [unrevealVotes, setUnrevealVotes] = useState(false);
  const [revealedVotes, setRevealedVotes] = useState(false);
  const [whoVoted, setWhoVoted] = useState(null)
  const [whoVoting, setWhoVoting] = useState(null)
  const [storyId, setStoryId] = useState('');
  const [story, setStory] = useState({ id: '', url: '', name: '', description: '' });
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyNotFound, setStoryNotFound] = useState(false);
  const [findStoryLabel, setFindStoryLabel] = useState('Load Story');
  const [findStoryDisabled, setFindStoryDisabled] = useState(false);
  const [storyCooldown, setStoryCooldown] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState(false);
  const [discussionInput, setDiscussionInput] = useState('');
  let isRendered = false;

  const isVisible = usePageVisibility();

  useEffect(() => {    
    isRendered = true;

    const listen = (message, func) => {
      socket.on(message, (ret) => {
        if (isRendered) { func(ret); }
      })
    }

    listen("room-users", (data) => {
      data = JSON.parse(data);
      setNewUserList(data);
      let user = _.find(data, x => x.id === socket.id);
      if (user !== undefined && user.name) {
        setUserName(user.name);
      }
    })

    listen("room-info", (data) => {
      data = JSON.parse(data);
      if (data.revealVotes) {
        setRevealedVotes(true);
      }
      setTopicList(data.topics);
    })

    listen("reset-votes", (data) => {
      setRevealedVotes(false);
    })

    listen("room-points", (data) => {
      setPointList(JSON.parse(data));
    })

    listen("someone-voted", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoted(vote);
    })

    listen("someone-voting", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoting(vote);
    })

    listen("update-is-voting", (data) => {  
      socket.emit('is-voting', isVisible);
    })

    listen("reveal-votes", (data) => {     
      setFlipAnimation(true); 
      setTimeout(() => setFlipAnimation(false), 1000)
      setRevealVotes(true);
      setRevealedVotes(true);
    })

    listen("unreveal-votes", (data) => {
      setRevealedVotes(false);
      setUnrevealVotes(true);
    })

    listen("update-votes", (data) => {      
      setRevealVotes(true);
    })

    listen("recover-vote", (data) => {
      setRecoverVote(data);
    })

    listen("rejoin", (data) => {
      socket.emit("joined-room");
    })

    listen("goto-room", (roomName) => {
      props.router.push('/' + roomName);
    })

    listen("goto-index", (data) => {      
      props.router.push('/');
    })

    listen("story-loading", (data) => { 
      setStoryLoading(data);     
    })

    listen("refresh", (data) => { 
      setRefresh(true);     
    })

    listen("topic-discussed", (topic) => { 
      setTopicDiscussed(topic);
    })

    listen("story-loaded", (story) => {      
      if (!_.isEmpty(story)) {
        setStoryNotFound(false);
        setStory(story);

        if(story.id) {
          setStoryId(story.id);
        }
        setStoryLoading(false);
        if (!story.no_cooldown) {
          setStoryCooldown(true);
        }
      }
    })

    listen("story-404", () => {
      setStoryNotFound(true);
      setStoryLoading(false);
      setStoryCooldown(true);
    })

    listen("close-story", () => {
      setStory({ id: '', url: '', name: '', description: '' });
    })

    listen("add-topic", (data) => {
      setNewTopic(data);
    })

    listen("remove-topic", (data) => {
      setRemoveTopic(data);
    })

    listen("clear-topics", (data) => {
      setTopicList([]);
    })

    listen("check-room-exists", () => {
      socket.emit('check-room-exists', JSON.stringify({ roomName: null, token: Cookies.get("user-token") }));
    })

    return () => {
      isRendered = false;
    };
  }, [])

  useEffect(() => {
    const room = props.router.query.room;
    if (room) {
      socket.emit('check-room-exists', JSON.stringify({ roomName: room, token: Cookies.get("user-token") }));
    }
  }, [props.router.query])

  useEffect(() => {
      if (newTopic) {
        let addingTopic = _.cloneDeep(topicList);
        addingTopic.push(newTopic);
        setTopicList(addingTopic);
        setSelectedTopic(null);
        topicSelect.clearValue();
      }
  }, [newTopic])

  useEffect(() => {
      if (removeTopic) {
        let removingTopic = _.cloneDeep(topicList);
        removingTopic = _.filter(topicList, x => x.index != removeTopic);
        setTopicList(removingTopic);
      }
  }, [removeTopic])

  useEffect(() => {
    if (topicDiscussed) {
      let tlist = _.cloneDeep(topicList);
      let t = _.find(tlist, x => x.index == topicDiscussed.index);
      if (t) {
        t.checked = topicDiscussed.checked;
        setTopicList(tlist);
      }
    }
  }, [topicDiscussed])

  useEffect(() => {
    setUserList(newUserList);
    /*
    let change = false;
    console.log(userList);
    console.log(newUserList);
    _.each(newUserList, (ul) => {
      let usr = _.find(userList, x => x.id === ul.id);
      if (usr) {
        if (usr.data.point != ul.data.point) {
          change = true;
        }
      }

      if (usr == undefined) {
        change = true;
      }
    })

    console.log(change);
    
    if (change) {
      setUserList(newUserList);
    }
    */
  }, [newUserList])  

  useEffect(() => {
    if (whoVoted) {
      let userListPointed = _.cloneDeep(userList);
      let changed = false;
      let u = _.find(userListPointed, x => x.id === whoVoted.id);
      if (u) {
        if (u.data.point != whoVoted.vote) {
          u.data.point = whoVoted.vote;
          changed = true;
        }
      }

      if (changed) {
        setUserList(userListPointed);
      }
    }
  }, [whoVoted])

  useEffect(() => {
    if (whoVoting) {
      let userListPointed = _.cloneDeep(userList);
      let u = _.find(userListPointed, x => x.id === whoVoting.id);
      if (u) {
        u.data.voting = whoVoting.status;
      }
      setUserList(userListPointed);
    }
  }, [whoVoting])

  useEffect(() => {
    if (Object.keys(userList).length > 0 && myVote === null) {
      //vote('Not voted');
    }
  }, [userList])

  useEffect(() => {
    if (revealVotes) {
      //vote(myVote);
      setRevealVotes(false);
    }
  }, [revealVotes])

  useEffect(() => {
    socket.emit('is-voting', isVisible);
  }, [isVisible])

  useEffect(() => {
    if (story.description) {
      let s = linkify(story.description);
      s = s.replace(/\n/g, '  \n');
      s = s.replace(/    -/g, '        -');
      s = s.replace(/  -/g, '    -');
      story.description = s;
    }
  }, [story])


  useEffect(() => {
    if (unrevealVotes) {
      socket.emit("voted", myVote);
      setUnrevealVotes(false);
    }
  }, [unrevealVotes])

  useEffect(() => {
    vote(recoverVote);
  }, [recoverVote])

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
      window.location.reload();
    }
  }, [refresh])

  useEffect(() => {
    if (storyCooldown) {
      setStoryCooldown(false);
      setFindStoryDisabled(true);
      let timeout = 6;
      let timer = setInterval(() => {
        timeout -= 1;
        setFindStoryLabel('Load Story' + ' (' + timeout + ')')
        if (timeout == 0) {
          clearInterval(timer);
          setFindStoryDisabled(false);
          setFindStoryLabel('Load Story')
        }
      }, 1000)
    }
  }, [storyCooldown])


  const linkify = (inputText) => {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '[$1]($1)');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '[$1]($2)');

    return replacedText;
  }

  const vote = (val) => {
    if (val !== null) {
      let userListPointed = _.cloneDeep(userList);
      let userListP = _.find(userListPointed, x => x.id === socket.id);
      if (userListP && userListP.data !== undefined) {
        userListP.data.point = val;        
      }
      setMyVote(val);
      setUserList(userListPointed);

    }
    socket.emit("voted", val);
  }

  const revealVotesAction = () => {
    if (!revealedVotes) {
      socket.emit("reveal-votes");
    } else {
      socket.emit("unreveal-votes");
    }
  }
  const resetVotesAction = () => {
    socket.emit("reset-votes");
  }
  const leaveRoomAction = () => {
    setTopicList([]);
    socket.emit("leave-room");
  }
  const getStory = (e) => {
    e.preventDefault();
    setStoryLoading(true);
    setStoryNotFound(false);
    socket.emit("get-story", storyId);
  }
  const start = (e) => {
    e.preventDefault();
    setEditingName(false);
    socket.emit("user-name", userNameInput);
    socket.emit("is-voting", true);
  }
  const closeStory = (e) => {
    e.preventDefault();
    socket.emit("close-story");
  }
  const delUser = (e) => {
    e.preventDefault();
    console.log("delUser");
    socket.emit("deluser");
  }
  const mostVoted = () => {
    let mostV = [];
    let totalV = totalVotes();

    Object.values(pointList).map((val: any) => {
      mostV.push({
        label: val,
        point: 0
      });
    });

    Object.values(userList).map((user: any) => {
      if (user.data.point != undefined) {
        let findLabel = _.find(mostV, x => x.label == user.data.point);
        if (findLabel) {
          findLabel.point++;
        }
      }
    })

    Object.values(mostV).map((most: any) => {
      most.width = most.point * (100 / totalV);
      most.scale = most.point * (1.5 / totalV);
    })
    return mostV; 
  }

  const totalVotes = () => {
    let votes = 0;
    Object.values(userList).map((user: any) => {
      if (user.data.point != undefined && user.data.point != 'Not voted' && user.data.point != 'Voted') {
        votes++;
      }
    })
    return votes;
  }

  const addTopic = () => {
    if (selectedTopic) {
      socket.emit('add-topic', selectedTopic.value);
    }
  }

  const removeTopicAction = (index) => {
    if (window.confirm('Are you sure you want to remove this topic?')) {
      socket.emit('remove-topic', index);
    }
  }

  const topicValues = () => {
    _.each(topics, topic => {
      _.each(topic.options, x => {
        x.value = x.label
      })
    })
    return topics;
  }

  const clearTopics = () => {
    if (window.confirm('Are you sure you want to remove all topics?')) {
      socket.emit('clear-topics');
    }
  }

  const topicDiscussedAction = (index, val) => {
    socket.emit('topic-discussed', { index: index, checked: val });
  }

  const solvedTopics = () => {
    let solved = _.filter(topicList, x => x.checked).length;
    return solved;
  }

  return (
    <>
    <title>Dundies Symple Points</title>
    <main>
      <div className="card-logo enlarge">
        <span><i>D</i></span>
        <span>u</span>
        <span>n</span>
        <span>d</span>
        <span>i</span>
        <span>e</span>
        <span>s</span>
        <div className="symple">symple points</div>
      </div>
      <div className="top">
        <div className="top-left">

          {(userName === '' || editingName) && (
          <div className="joined-as">
            <>
              { !editingName &&
              <div className="blurb">To join this pointing session, please enter your name:</div>}
              { editingName &&
              <div className="blurb">What's your new name?</div>}
              <div className="field">
                <form className="flex" onSubmit={(e) => start(e)}>
                  <input type="text" className="regular-input mr-10" placeholder="Name" required onChange={(e) => setUserNameInput(e.target.value)} value={userNameInput} /> 
                  <button disabled={userNameInput.length < 1} className="action">Start</button>
                </form> 
              </div> 
            </>
          </div>
          )}

          {userName !== '' && !editingName && (
            <>
                <h2 className="username"><a className="icon" onClick={() => { setEditingName(true); }}><FaEdit /></a>
                {userName}</h2>
            </>
          )}

        </div>

        <div className="top-right">
          <div className="top-action">
            <button title="Leave room" onClick={() => { leaveRoomAction() }} className="action icon-button"><BiDoorOpen /></button> 
          </div>
          <div className="top-info">
            {Object.values(userList).filter((x: any) => x.name == undefined).length >= 0 &&
            <div className="observers">
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name == undefined).length}</span> Observing</div>
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name != undefined).length}</span> Participating</div>
            </div>}
          </div>
        </div>
      </div>


      <div className="booklet">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">

        <div className="flex">


          <div className="point">
            {userName != '' &&
              <ul className="point-options">
              {Object.values(pointList).map((val: any) => {
                return <li key={val}><button className="shadow" onClick={() => { vote(val) }}>{val}</button></li>
              })}
              </ul>
            }

            <ul className="name-list">
            {Object.values(userList).map((val: any) => {
              return val.name && (<li key={val.id}>
                <div className="name">{val.name}</div>


                <div className="card-placeholder">

                  {(socket.id == val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                    <div className={`vote-card flipped`} >
                    <div className="inner">
                        <div className="front shadow">{val.data.point}</div>
                        <div className="back card-logo"><span><i>D</i></span></div>
                      </div>
                    </div>
                  }

                  {(socket.id != val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                  <div className={`vote-card ${flipAnimation ? "unflip" : "flipped"}`} >
                    <div className="inner">
                      <div className="front shadow">{val.data.point}</div>
                      <div className="back card-logo"><span><i>D</i></span></div>
                    </div>
                  </div>
                  }

                  {val.data.point == 'Voted' &&
                  <div className="vote-card">
                    <div className="inner">
                      <div className="front shadow">{val.data.point}</div>
                      <div className="back card-logo"><span><i>D</i></span></div>
                    </div>
                  </div>
                  }

                  {val.data.point == 'Not voted' &&
                  <div className="vote-card">
                    <div className="inner bg-white">
                      <div className="back shadow">
                      {val.data.voting &&
                        <div className="wave">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </div>
                      }

                      {!val.data.voting &&
                      <div className="wave stopped">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                      }
                      </div>
                    </div>
                  </div>
                  }

                </div>
              </li>)
            })}

            {Object.values(userList).find((x: any) => x.name != undefined) == undefined &&
              <li>No one joined the pointing yet.</li>}
            </ul>

            {!(Object.values(userList).find((x: any) => x.name != undefined) == undefined) &&
              <div className="pointing-actions">
                <button className="action danger fleft" onClick={() => { resetVotesAction() }}><VscDebugRestart />Reset</button> 
                <div className="action secondary fright switchToggle" onClick={() => { revealVotesAction() }}>
                  <label><Switch width={35} checkedIcon={false} uncheckedIcon={false} handleDiameter={20} height={20} className="toggle" onChange={revealVotesAction} checked={revealedVotes} />
                  Reveal votes</label>
                </div> 
              </div>
            }
            {revealedVotes && totalVotes() > 0 &&
              <div className="most-voted fadeInSlow">
                <h3 className="mb-0">Most Voted: </h3>
                <ul>
                  {mostVoted().map((val: any) => {
                    return val.point > 0 && <li key={val.label} style={{ width: val.width + '%' }}>
                      <div className="card shadow" style={{ transform: 'scale('+ val.scale + ')' }}>{val.label}</div>
                    </li>
                  })}
              </ul>
              </div>
            }
          </div>

          <div className="story">
            <div className="story-area">
              <form className="flex" onSubmit={(e) => getStory(e)}>
                <input className="regular-input mr-10" type="text" placeholder="Story ID" required onChange={(e) => setStoryId(e.target.value)} value={storyId} /> 
                <button className="action nowrap load-story" disabled={findStoryDisabled || storyLoading}>{ findStoryLabel }</button>
              </form> 
              {storyNotFound && <div className="story-status"><BiSad /> The story was not found.</div>}
              {storyLoading && <div className="story-status"><BiSearchAlt /> Loading a story, please wait...</div>}

              {story.id && 
              <div>
                <a className="title" href={story.url} target="_blank"><AiOutlineLink /> {story.name}</a>
                <div className="description tracker-markup">
                  <ReactMarkdown
                  children={ story.description }
                  linkTarget='_blank'
                  ></ReactMarkdown>
                </div>
                <button className="action mt-10 danger fright" onClick={(e) => { closeStory(e) }}><AiOutlineCloseCircle />Close Story</button> 
              </div>
              }
            </div>
            <div className="discussion">
              <div className="flex add-topic" onKeyUp={(e) => { e.keyCode == 13 ? addTopic() : null }}>
                <Creatable
                  options={topicValues()} 
                  ref={(ref) => {
                    setTopicSelect(ref);
                  }}
                  onChange={(e) => setSelectedTopic(e)}
                  placeholder="Select or write a topic"
                  formatCreateLabel={(e) => { return e; }}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  menuShouldBlockScroll={true}
                  className="mr-10"
                />
                <button onClick={(e) => { addTopic() }} className="action icon-only"><AiOutlinePlus size={20} /></button>
              </div>

              <div className="topics">
                <ul>

                  {topicList.map((val: any) => {
                    return val.text && 
                    <li onKeyUp={(e) => { e.keyCode == 13 ? topicDiscussedAction(val.index, !val.checked) : null }} key={val.index} tabIndex={0} className={`${val.checked ? "discussed" : ""} ${val.user ? "mb-25" : ""}`}>
                      <label>
                        <div className="topic-discussed">
                          <Checkbox
                            icon={<AiOutlineCheck color="#56a359" size={20} />}
                            name="my-input"
                            checked={val.checked}
                            onChange={(value) => {
                              topicDiscussedAction(val.index, value);
                            }}
                            size={20}
                            borderColor="#56a359"
                            style={{ cursor: "pointer" }}
                            labelStyle={{ marginLeft: 5, userSelect: "none" }}
                          />
                        </div>
                        {val.user &&
                        <div className="topic-user">{val.user}</div>}
                        <div className="topic-text">{val.text}</div>
                        {val.user_id == socket.id &&
                        <div className="topic-remove">
                          <button onClick={(e) => { removeTopicAction(val.index); }}>
                            <RiCloseCircleFill color="#912929" size={20} />
                          </button>
                        </div>
                        }
                      </label>
                    </li>
                  })}
                </ul>
              </div>  

              {topicList.length > 0 && 
              <div className="discussion-actions">
                <button className="action clear-topics danger fleft" onClick={() => { clearTopics() }}><VscDebugRestart />Clear topics</button> 
                <div className="topic-count">{ solvedTopics() + ' / ' + topicList.length }</div>
              </div>}
            </div>
          </div>


        </div>


      </div>
      </div>
      </div>
      </div>
      </div>
    </main>
    </>
  );
}

export default withRouter(Room);