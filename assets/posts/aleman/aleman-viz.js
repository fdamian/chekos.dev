async function drawBeeswarmPlot() {
    // Access data
    const data = await d3.json("https://gist.githubusercontent.com/chekos/e4694ec10cf4e81c6cffb2db5d13456f/raw/5651c4093e51d42694916b20906928f9884b8e65/aleman-network-v6.json")
    const nodes = data.nodes
    const width = document.getElementById("bees").offsetWidth
    // create chart dimensions
    const height = document.getElementById("bees").offsetHeight
    const radius = width / 50
    let margins = {top: 15, right: 15, bottom: 40, left: 60}
    margins.boundedHeight = height - margins.bottom - margins.top
    margins.boundedWidth = width - margins.left - margins.right
    let dimensions = {
      width: width,
      height: height,
      radius: 15,
      margins: {
        top: 15,
        right: 15,
        bottom: 40,
        left: 80,
      },    
    }
    
    // draw canvas
    const svg = d3.select("#bees")
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
    
    const bounds = svg.append("g")
      .attr("transform", `translate(${dimensions.margins.left}, ${dimensions.margins.top})`)
    
    // scales and accessors
    /// accessors
    const popularityAccessor = d => parseInt(d.popularity)
    const followersAccessor = d => parseInt(d.followers)
    const genreAccessor = d => d.genres.split(";")[0]
    const defaultImage = "https://image.flaticon.com/icons/svg/906/906794.svg"
    const imageAccessor = d => d.images.length > 0 ? d.images[0].url : defaultImage
    const fillAccessor = d => `url(#image-${d.spotify_id})`
    const cleanNameAccessor = d => d.name.replace("\\xc3\\xad", "í").replace("\\xc3\\xa1", "á").replace("\\xc3\\xb3", "ó").replace("\\xc3\\xb1", "ñ").replace("\\xc3\\xa9", "é").replace("\\xc3\\xbc", "ü")
    const topTrackInfo = function(d) {
      let _n = Math.floor(Math.random() * d.top_tracks.tracks.length)
      let musicUrl = d.top_tracks.tracks[_n].preview_url
      let name = d.top_tracks.tracks[_n].name
      let albumName = d.top_tracks.tracks[_n].album.name
      let albumCover = d.top_tracks.tracks[_n].album.images[1].url
      return {
        name: name,
        albumName: albumName,
        albumCover: albumCover,
        musicUrl: musicUrl,
      }
    }
    
    //scales
    /// for radius?  
    const popularityScale = d3.scaleLinear()
      .domain(d3.extent(nodes, popularityAccessor))
      .range([2, 25])
    
    const followersScale = d3.scaleLinear()
      .domain(d3.extent(nodes, followersAccessor))
      .range([5, 30])
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(nodes, popularityAccessor))
      .range([radius, margins.boundedWidth])
      .nice()
    
    // from https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
    const colors22 = [
      "#e6194b",
      "#3cb44b",
      "#ffe119",
      "#4363d8",
      "#f58231",
      "#911eb4",
      "#46f0f0",
      "#f032e6",
      "#bcf60c",
      "#fabebe",
      "#008080",
      "#e6beff",
      "#9a6324",
      "#fffac8",
      "#800000",
      "#aaffc3",
      // "#808000",
      // "#ffd8b1",
      // "#000075",
      // "#808080",
      // "#ffffff",
      // "#000000"
    ]
    const genreScale = d3.scaleOrdinal(colors22)
    
    // Layout
    const manyBody = d3.forceManyBody()
      .strength(10)
    const center = d3.forceCenter()
      .x(margins.boundedWidth / 2)
      .y(margins.boundedHeight / 2)
    const force = d3.forceSimulation()
      .force("collision", d3.forceCollide(dimensions.radius))
      .force("x", d3.forceX(margins.boundedWidth / 2))
      .force("y", d3.forceY(d => yScale(popularityAccessor(d))).strength(2))
      .nodes(nodes)
      .on("tick", updateNetwork)
  
    // draw data  
    const nodeGroup = bounds.selectAll("g.node")
      .data(nodes)
      .enter().append("g")
        .attr("class", "node")
    
    const defs = nodeGroup.append("defs");
    defs.append('pattern')
      .attr("id", d => "image-" + d.spotify_id)
      .attr("width", 1)
      .attr("height", 1)
      .append("svg:image")
      .attr("xlink:href", d => imageAccessor(d))
      .attr("width", dimensions.radius * 2)
      .attr("preserveAspectRatio","xMidYMid slice")
  
    nodeGroup.append("circle")
      .attr("class", "rapper-circle")
      .attr("fill", d => fillAccessor(d))
      .attr("opacity", d => followersAccessor(d) > 1000000 ? 1 : .7)
      .attr("stroke",d => cleanNameAccessor(d) == "Aleman" ? "#DC0D7A" : genreScale(genreAccessor(d)))
      .attr("stroke-width",d => followersAccessor(d) > 1000000 ? "3" : "1.5")
      .attr("r", dimensions.radius)
      .append("title").text(d => `${cleanNameAccessor(d)} - ${genreAccessor(d)}`)
    
  //   nodeGroup.append("text")
  //       .attr("class", "rapper-name")
  //       .style("fill", "black")
  //       .text(d => followersAccessor(d) > 1000000 ? cleanNameAccessor(d) : "")
    
    // peripherals
    const yAxisGenerator = d3.axisLeft().scale(yScale)
    const yAxis = bounds.append("g")
      .attr("class", "y-axis")
      .call(yAxisGenerator)
    
    const yAxisLabel = bounds.append("text")
      .attr("class", "y-axis-label")
      .attr("x", -margins.boundedHeight / 2)
      .attr("y", -margins.left + 10)
      .text("índice de popularidad")
    
    const tooltip = d3.select("#tooltip")
    const formatFollowers = d3.format(",.0f")
      
    // interacciones
    bounds.selectAll(".rapper-circle")
      .on("mouseenter", onMouseEnter)
      .on("mouseleave", onMouseLeave)
      .on("click", onMouseEnter)
    
    
    function updateNetwork() {
      d3.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
      d3.selectAll(".rapper-name")
        .attr("class", d => d.x > dimensions.boundedWidth / 2 ? "rapper-name right-side-name" : "rapper-name left-side-name")
        .attr("dx", d => d.x > dimensions.boundedWidth / 2 ? d.x + dimensions.radius : d.x - dimensions.radius)
        .attr("dy", d => d.y)
    }
    
    function onMouseEnter(rapperDatum) {
     const trackInfo = topTrackInfo(rapperDatum)
     const highlightRapper = bounds.append("circle")
        .attr("class", "rapper-datum")
        .attr("cx", rapperDatum.x)
        .attr("cy", rapperDatum.y)
        .attr("fill", cleanNameAccessor(rapperDatum) == "Aleman" ? "#DC0D7A": genreScale(genreAccessor(rapperDatum)))
        .attr("stroke","black")
        .attr("stroke-width", 2)
        .attr("r", dimensions.radius * 3)
        .style("pointer-events", "none")
  
      
      tooltip.select("#followers")
        .text(formatFollowers(followersAccessor(rapperDatum)))
      tooltip.select("#popularity")
        .text((popularityAccessor(rapperDatum)))
      tooltip.select("#name")
        .text(cleanNameAccessor(rapperDatum))
      tooltip.select("#genres")
        .html(rapperDatum.genres.replace(/;/gi, ", "))
      tooltip.select("#image")
        .html(`<img src=${imageAccessor(rapperDatum)} class="side-album">`)
      tooltip.select("#top-track")
        .html(`
  <figure>
    <img src="${trackInfo.albumCover}" class="lil-album" alt="${trackInfo.albumName}" style="width:50%">
    <figcaption>${trackInfo.albumName} </br> ${trackInfo.name}</figcaption>
  </figure>
  <audio autoplay>
    <source src="${trackInfo.musicUrl}" type="audio/mp3">
    Your browser does not support the audio tag.
  </audio>
  `)    
      const x = rapperDatum.x + dimensions.margins.left
      const y = rapperDatum.y + dimensions.margins.top
      // tooltip.style("transform", `translate( calc(-50% + ${x}px), calc( -100% - ${y/3}px))`)
      // tooltip.style("opacity", 1)
    }
    function onMouseLeave() {
      tooltip.style("opacity", 0)
      tooltip.select("#top-track").html("eh")
      d3.selectAll(".rapper-datum")
        .remove()
    }
  }

  drawBeeswarmPlot()
