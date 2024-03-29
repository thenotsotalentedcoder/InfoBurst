import { useEffect, useState } from 'react';
import supabase from './supabase';
import './style.css';

const CATEGORIES = [
  { name: "computer science", color: "#F37121" },
  { name: "games", color: "#068DA9" },
  { name: "entertainment", color: "#F8DE22" },
  { name: "technology", color: "#C70039" },
  { name: "football", color: "#42032C" },
  { name: "cricket", color: "#38E54D" },
  { name: "history", color: "#3B0000" },
  { name: "news", color: "#8b5cf6" },
];

function App() {
  const [showForm, setShowForm] = useState(false);
  const [facts, setFacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("all");

  useEffect(function () {
    async function getFacts(){
      setIsLoading(true);

      let query = supabase.from("facts").select("*").order("created_at", {ascending: false});

      if (currentCategory !== "all") query = query.eq("category", currentCategory);

      const { data: facts, error } = await query.limit(5000)

      if (!error) setFacts(facts);
      else alert("problem");
      setIsLoading(false);
    }

    getFacts();
  }, [currentCategory]);

  return (
    <>
      <Header showForm={showForm} setShowForm={setShowForm} />
      {showForm ? <NewFactForm setFacts={setFacts} setShowForm={setShowForm} /> : null}

      <main className="main">
        <CategoryFilter setCurrentCategory={setCurrentCategory} />
        {isLoading ? <Loader /> : <FactList facts={facts} setFacts={setFacts} setCurrentCategory={setCurrentCategory} />}
      </main>
    </>
  );
}

function Loader(){
  return <p className="message">Loading....</p>
}

function Header({showForm, setShowForm}) {
  const appTitle = "Welcome to InfoBurst"

  return (
    <header className="header">
      <div className="logo">
        <img src="logo.png" height="68" width="68" alt="Today I Learned Logo" />
        <h1>{appTitle}</h1>
      </div>
      <button className="btn btn-large btn-open" onClick={()=>setShowForm((show) => !show)}>{showForm ? "Close" : "Share!"}</button>
    </header>
  )
}

function isValidHttpUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

function NewFactForm({setFacts, setShowForm}){
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [isUploading, setIsUploading] = useState(false)
  const [isValidUrl, setIsValidUrl] = useState(true);
  const textLentgh = text.length;

  async function HandleSubmit(e) {
    // prevent browser reload
    e.preventDefault();

    // check if data is valid. Create new fact if valid
    if (text && isValidHttpUrl(source) && category && textLentgh<=200){
      // create a new fact object
      setIsUploading(true);
      const {data: newFact, error} = await supabase.from("facts").insert([{text, source, category}]).select()
      setIsUploading(false)
      
      //add new fact to UI/STATE
      setFacts((facts) => [newFact[0], ...facts]);

      // RESET INPUT FIELDS
      setText("");
      setSource("");
      setCategory("");

      setShowForm(false)
      setIsValidUrl(true);
    } else if (!isValidHttpUrl(source)) {
      setIsValidUrl(false);
    }
  }

  return (
    <form className="fact-form" onSubmit={HandleSubmit}>
      <input type="text" placeholder="Got interesting information? Share here!..." value={text} onChange={(e) => setText(e.target.value)} />
      <span>{200 - textLentgh}</span>
      <input value={source} type="text" placeholder="Trustworthy Source...." onChange={(e) => {setSource(e.target.value); setIsValidUrl(true);}} disabled={isUploading} />
      {!isValidUrl && <p style={{color: 'red'}}>Please enter a valid URL starting with http...</p>}
      <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isUploading}>
        <option value={""}>Choose Category:</option>
        {CATEGORIES.map((cat) => <option key={cat.name} value={cat.name}>{cat.name.toUpperCase()}</option>)}
      </select>
      <button className="btn btn-large" disabled={isUploading}>Post</button>
    </form>
  );
}


function CategoryFilter({setCurrentCategory}){
  return (
    <aside>
      <ul>
        <li className="Category"><button className="btn btn-all-categories" onClick={() => setCurrentCategory("all")}>All</button></li>
        {CATEGORIES.map((cat)=> <li key={cat.name} className="Category"><button className="btn btn-category" style={{backgroundColor: cat.color}} onClick={() => setCurrentCategory(cat.name)}>{cat.name}</button></li>)}
      </ul>
    </aside>
  )
}

function FactList({facts, setFacts, setCurrentCategory}){
  if (facts.length === 0) {
    return ( <p className="message">No item in this category yet!. Add the First one 😊</p> )
  }

  return (
    <section>
      <ul className="facts-list">
        {facts.map((fact) => (<Fact key={fact.id} fact={fact} setFacts={setFacts} setCurrentCategory={setCurrentCategory} />))}
      </ul>
      <p>{facts.length} item(s) in this database. Add your own!</p>
    </section>
  );
}

function Fact({fact, setFacts, setCurrentCategory}){
  const [isUpdating, setIsUpdating] = useState(false)
  const [voted, setVoted] = useState(JSON.parse(localStorage.getItem(fact.id)) || {votesLove: false, votesInteresting: false, votesFalse: false})
  const isDisputed = fact.votesLove + fact.votesInteresting < fact.votesFalse

  useEffect(() => {
    localStorage.setItem(fact.id, JSON.stringify(voted));
  }, [voted, fact.id]);

  async function handleVote(columnName) {
    setIsUpdating(true);

    // If the user has already voted for this option, then return
    if (voted[columnName]) {
      setIsUpdating(false);
      return;
    }

    // Prepare the updates
    let updates = {
      votesLove: fact.votesLove - (voted.votesLove ? 1 : 0),
      votesInteresting: fact.votesInteresting - (voted.votesInteresting ? 1 : 0),
      votesFalse: fact.votesFalse - (voted.votesFalse ? 1 : 0),
    };
    updates[columnName] = fact[columnName] + 1;

    const { data: updatedFact, error } = await supabase
      .from("facts")
      .update(updates)
      .eq("id", fact.id)
      .select();
    setIsUpdating(false);

    if (!error) {
      setFacts((facts) =>
        facts.map((f) => (f.id === fact.id ? updatedFact[0] : f))
      );
      setVoted({votesLove: false, votesInteresting: false, votesFalse: false, [columnName]: true});
    }
  }


  return (
    <li className="fact">
      <p>
        {isDisputed ? <span className="disputed"><em>[⛔️DISPUTED] </em></span> : null}
        {fact.text}
        <a className="Source" href={fact.source} target="_blank" >(Source)</a>  
      </p>
      <button className="tag" style={{backgroundColor: CATEGORIES.find((cat)=> cat.name  === fact.category).color,}} onClick={() => setCurrentCategory(fact.category)}>
        #{fact.category}#
      </button>
      <div className="vote-buttons">
        <button onClick={()=> handleVote("votesLove")} disabled={isUpdating || voted.votesLove}>❤️ {fact.votesLove}</button>
        <button onClick={()=> handleVote("votesInteresting")} disabled={isUpdating || voted.votesInteresting}>👍 {fact.votesInteresting}</button>
        <button onClick={()=> handleVote("votesFalse")} disabled={isUpdating || voted.votesFalse}>⛔️ {fact.votesFalse}</button>
      </div>
    </li>
  );
}

export default App;


